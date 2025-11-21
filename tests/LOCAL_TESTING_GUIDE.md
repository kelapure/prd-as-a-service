# Local Testing Guide: Stripe Payment Flow

This guide walks you through testing the Stripe payment integration locally.

## ⚠️ Important: Use Test Mode

**Your current setup uses LIVE keys** which will charge real money. For safe testing:

### Get Test Keys from Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. **Switch to Test Mode** (toggle in top-right corner)
3. Go to [Developers → API keys](https://dashboard.stripe.com/test/apikeys)
4. Copy your test keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

### Create Test Product & Price

1. In Test Mode, go to [Products](https://dashboard.stripe.com/test/products)
2. Create product:
   - Name: `PRD Evaluation`
   - Price: `$0.99` (one-time)
3. Copy the **Price ID**: `price_...`

### Create Test Webhook

1. Go to [Developers → Webhooks](https://dashboard.stripe.com/test/webhooks) (Test Mode)
2. Click **Add endpoint**
3. Endpoint URL: `http://localhost:8080/api/payments/webhook`
4. Select event: `checkout.session.completed`
5. Copy the **Signing secret**: `whsec_...`

### Update Environment Variables

Replace the live keys in `api-gateway/.env`:

```bash
# Replace these with TEST keys:
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_WEBHOOK_SECRET
STRIPE_PRICE_ID=price_YOUR_TEST_PRICE_ID
```

And in `frontend/.env`:

```bash
# Replace with TEST publishable key:
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY
```

---

## 🚀 Running Local Tests

### Step 1: Verify Stripe Setup

```bash
cd api-gateway
node test-stripe-setup.js
```

You should see: **🧪 TEST MODE** ✅

### Step 2: Start Services

**Terminal 1** - API Gateway:
```bash
cd api-gateway
npm run dev
```

**Terminal 2** - Frontend:
```bash
cd frontend
npm run dev
```

**Terminal 3** - Stripe Webhook Forwarding (Test Mode only):
```bash
# Install Stripe CLI if you haven't:
# brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8080/api/payments/webhook
```

The Stripe CLI will output a webhook signing secret starting with `whsec_...`. Use this in your `api-gateway/.env` for local testing.

### Step 3: Test Payment Flow

1. Open frontend: http://localhost:3000
2. Upload a PRD and run evaluation
3. Click "Save & Export" (requires authentication)
4. Complete payment with test card

**Test Card Numbers** (Test Mode only):
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires 3D Secure**: `4000 0025 0000 3155`

Use any future expiry date (e.g., `12/25`) and any 3-digit CVC (e.g., `123`).

### Step 4: Verify Webhook

After completing payment, check:

1. **Stripe CLI output** (Terminal 3) - should show `checkout.session.completed` event
2. **API Gateway logs** (Terminal 1) - should show successful payment processing
3. **Firestore** - should have new record in `evaluations` collection

---

## 🔍 Testing Without Full Setup

If you don't have Firebase configured yet, you can test the Stripe API directly:

### Test Health Endpoint

```bash
curl http://localhost:8080/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Test Binary Score Endpoint (No Auth Required)

```bash
curl -X POST http://localhost:8080/api/evalprd/binary_score \
  -H "Content-Type: application/json" \
  -d '{"prd_text":"This is a test PRD with minimal requirements."}'
```

Expected: SSE stream with evaluation results

### Test Create Checkout Session (Requires Auth)

**Note**: This endpoint requires a Firebase ID token. You'll need to:
1. Complete Firebase setup (see `SETUP_AUTH_PAYMENTS.md`)
2. Sign in via frontend to get a token
3. Use token in Authorization header

```bash
curl -X POST http://localhost:8080/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "evaluationData": {
      "prdTitle": "Test PRD",
      "prdText": "Sample PRD content",
      "binaryScore": {...},
      "fixPlan": {...},
      "agentTasks": {...}
    }
  }'
```

Expected: `{"checkoutUrl":"https://checkout.stripe.com/...","sessionId":"cs_test_..."}`

---

## 🐛 Troubleshooting

### Stripe Errors

**"No such price"**
- Make sure you created the product in the correct mode (Test vs Live)
- Verify `STRIPE_PRICE_ID` matches the mode

**"No signatures found matching the expected signature"**
- For local testing, use the webhook secret from `stripe listen` output
- Don't use the production webhook secret for local testing

**"Invalid API Key provided"**
- Verify you're using the correct mode (test keys start with `sk_test_`)
- Check there are no extra spaces in `.env` file

### API Gateway Errors

**"Missing required environment variable: FIREBASE_PROJECT_ID"**
- You need to complete Firebase setup first
- See `SETUP_AUTH_PAYMENTS.md` for instructions

**Port 8080 already in use**
- Kill the process: `lsof -ti:8080 | xargs kill -9`
- Or change port: `PORT=8081 npm run dev`

### Frontend Errors

**"Missing Firebase configuration"**
- Add Firebase config to `frontend/.env`
- See `SETUP_AUTH_PAYMENTS.md` Part 1, Step 4

**CORS errors**
- Verify `ALLOWED_ORIGIN` in `api-gateway/.env` matches frontend URL
- Default: `http://localhost:3000`

---

## 📊 Monitoring Test Payments

### Stripe Dashboard

- [Test Payments](https://dashboard.stripe.com/test/payments) - See all test transactions
- [Test Logs](https://dashboard.stripe.com/test/logs) - Debug API calls
- [Test Webhooks](https://dashboard.stripe.com/test/webhooks) - View webhook events

### Stripe CLI

```bash
# View recent events
stripe events list

# View specific event
stripe events retrieve evt_...

# Trigger test webhook manually
stripe trigger checkout.session.completed
```

---

## 🔄 Switching Between Test and Live Mode

**For Development**: Use test keys (safe, no real charges)
**For Production**: Use live keys (real payments)

Update these files when switching:
- `api-gateway/.env` - Backend keys
- `frontend/.env` - Frontend publishable key
- Restart both services after changing

---

## ✅ Ready for Production

Once testing is complete:

1. Switch to **Live Mode** in Stripe Dashboard
2. Update webhook URL to production: `https://evalgpt.com/api/payments/webhook`
3. Update environment variables with **live keys**
4. Deploy to production (see `cloud/DEPLOY_APP_ENGINE.md`)

---

**Questions?** Check [Stripe Testing Docs](https://docs.stripe.com/testing) or [SETUP_AUTH_PAYMENTS.md](../SETUP_AUTH_PAYMENTS.md)

