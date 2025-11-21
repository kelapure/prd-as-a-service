# Setup Guide: Firebase Authentication & Stripe Payments

This guide walks you through setting up Firebase (Google OAuth) and Stripe (payments) for the EvalPRD application.

## Part 1: Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Project name: `evalprd` (or your choice)
4. Disable Google Analytics (optional for this use case)
5. Click "Create project"

### 2. Enable Google Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Google** provider
3. Toggle **Enable**
4. Set support email (your Gmail)
5. Click **Save**

### 3. Add Authorized Domains

1. Still in **Authentication** → **Sign-in method** → **Authorized domains**
2. Add domains:
   - `localhost` (already there by default)
   - `evalgpt.com` (your production domain)

### 4. Get Firebase Config (Frontend)

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to "Your apps" → Click web icon `</>`
3. Register app name: `evalprd-web`
4. Copy the config object - you'll need these values for `frontend/.env`:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",           // → VITE_FIREBASE_API_KEY
     authDomain: "...",        // → VITE_FIREBASE_AUTH_DOMAIN
     projectId: "...",         // → VITE_FIREBASE_PROJECT_ID
   };
   ```

### 5. Generate Service Account (Backend)

1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file (keep it secure!)
4. Extract these values for `api-gateway/.env`:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` newlines)

### 6. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select location (e.g., `us-central`)
4. Click **Enable**

### 7. Set Firestore Security Rules

1. Go to **Firestore Database** → **Rules**
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own evaluations
    match /evaluations/{evalId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Payments are backend-only (no client writes)
    match /payments/{paymentId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false; // Only backend can write via Admin SDK
    }
  }
}
```

3. Click **Publish**

---

## Part 2: Stripe Setup

### 1. Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Sign up or log in
3. **Start in Test Mode** (toggle in top-right)

### 2. Create Product & Price

1. Go to **Products** → **Add product**
2. Fill in:
   - Name: `PRD Evaluation`
   - Description: `Unlock save and export features for one PRD evaluation`
   - Pricing model: **One time**
   - Price: `0.99` USD
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_...`) → use as `STRIPE_PRICE_ID` in `api-gateway/.env`

### 3. Get API Keys

1. Go to **Developers** → **API keys**
2. Copy:
   - **Publishable key** (starts with `pk_test_...`) → `VITE_STRIPE_PUBLISHABLE_KEY` in `frontend/.env`
   - **Secret key** (starts with `sk_test_...`) → `STRIPE_SECRET_KEY` in `api-gateway/.env`

### 4. Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL:
   - Local dev: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) for testing
   - Production: `https://evalgpt.com/api/payments/webhook`
4. **Events to listen**:
   - Select: `checkout.session.completed`
5. Click **Add endpoint**
6. Copy **Signing secret** (starts with `whsec_...`) → `STRIPE_WEBHOOK_SECRET` in `api-gateway/.env`

### 5. Test with Stripe CLI (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8080/api/payments/webhook

# Copy the webhook signing secret from output → STRIPE_WEBHOOK_SECRET
```

---

## Part 3: Environment Variables

### Backend (`api-gateway/.env`)

```bash
# Existing
ANTHROPIC_API_KEY=sk-ant-...
PORT=8080
ALLOWED_ORIGIN=http://localhost:3000

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

### Frontend (`frontend/.env`)

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:8080
```

---

## Part 4: Testing Payment Flow Locally

1. **Start services**:
   ```bash
   # Terminal 1: API Gateway
   cd api-gateway && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   
   # Terminal 3: Stripe webhook forwarding
   stripe listen --forward-to localhost:8080/api/payments/webhook
   ```

2. **Test with Stripe test cards**:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date, any CVC

3. **Verify webhook events** in Stripe CLI output

---

## Part 5: Production Deployment

### Update Environment Variables

1. **Firebase**: Add `evalgpt.com` to authorized domains
2. **Stripe**: 
   - Switch to **Live Mode** in Stripe Dashboard
   - Update webhook endpoint to production URL
   - Replace all test keys with live keys (`pk_live_...`, `sk_live_...`)

### Google App Engine

Update `api-gateway/app.local.yaml`:

```yaml
env_variables:
  FIREBASE_PROJECT_ID: "your-project-id"
  FIREBASE_CLIENT_EMAIL: "firebase-adminsdk-xxxxx@..."
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  STRIPE_SECRET_KEY: "sk_live_..."
  STRIPE_WEBHOOK_SECRET: "whsec_..."
  STRIPE_PRICE_ID: "price_..."
```

Update `frontend/.env.production`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://evalgpt.com
```

---

## Troubleshooting

### Firebase Auth Issues
- Verify authorized domains include your domain
- Check browser console for CORS errors
- Ensure Firebase API key is correct

### Stripe Webhook Issues
- Verify webhook signature secret matches
- Check webhook endpoint is accessible (not behind firewall)
- Use Stripe Dashboard → Webhooks → Logs to debug

### Firestore Permission Denied
- Verify security rules are published
- Check user is authenticated before database operations
- Ensure `userId` matches `request.auth.uid`

---

**Next Steps**: After completing this setup, proceed with the implementation in the codebase.

