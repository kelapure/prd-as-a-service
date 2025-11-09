# Deploy to App Engine + evalgpt.com

This guide documents the actual deployment process for EvalPRD to Google Cloud App Engine with custom domain.

## Prerequisites

- Google Cloud project: `dompe-dev-439304`
- Domain registered: `evalgpt.com`
- `gcloud` CLI installed and authenticated
- OpenAI API key with sufficient quota

## 1) Configure gcloud and App Engine

```bash
PROJECT_ID=dompe-dev-439304
REGION=us-central

gcloud config set project "$PROJECT_ID"
gcloud services enable appengine.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud app describe || gcloud app create --region="$REGION"
```

## 2) Grant App Engine Service Account Permissions

**Important:** App Engine uses a service account that needs permissions for Cloud Build and Artifact Registry.

```bash
# Grant Artifact Registry permissions
gcloud artifacts repositories create us.gcr.io \
  --repository-format=docker \
  --location=us \
  --description="Container images for App Engine" || true

gcloud artifacts repositories add-iam-policy-binding us.gcr.io \
  --location=us \
  --member=serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com \
  --role=roles/artifactregistry.writer
```

## 3) Configure Secrets with app.local.yaml

**IMPORTANT:** Never commit API keys to git. Use `app.local.yaml` (already in .gitignore).

Create `api-gateway/app.local.yaml`:

```yaml
env_variables:
  OPENAI_API_KEY: sk-proj-YOUR-ACTUAL-KEY-HERE
```

Create `cloud/app.local.yaml`:

```yaml
env_variables:
  OPENAI_API_KEY: sk-proj-YOUR-ACTUAL-KEY-HERE
```

These files are git-ignored and will overlay the base `app.yaml` during deployment.

## 4) Build Frontend and API Gateway

```bash
# Build frontend
cd frontend
npm install
npm run build
cd ..

# Build API gateway
cd api-gateway
npm install
npm run build
cd ..
```

## 5) Deploy API Service (Standard Environment)

```bash
# Deploy API service with secrets overlay
gcloud app deploy cloud/app.yaml cloud/app.local.yaml --quiet
```

This deploys:
- Service: `api`
- Environment: Standard (Node.js 20)
- Includes: API Gateway with direct OpenAI integration

## 6) Deploy Frontend Service (Standard Environment)

```bash
# Deploy frontend (must be named 'default' as it's the first service)
gcloud app deploy frontend/app.yaml --quiet
```

This deploys:
- Service: `default` (required name for first service)
- Environment: Standard (Node.js 20)
- Type: React SPA

## 7) Deploy Dispatch Rules

The `cloud/dispatch.yaml` file routes requests between services:

```yaml
dispatch:
  # API endpoints for evalgpt.com domain
  - url: "evalgpt.com/api/*"
    service: api
  - url: "www.evalgpt.com/api/*"
    service: api

  # All other paths go to the frontend (default service)
  - url: "evalgpt.com/*"
    service: default
  - url: "www.evalgpt.com/*"
    service: default
```

Deploy dispatch rules:

```bash
gcloud app deploy cloud/dispatch.yaml --quiet
```

## 8) Verify Domain Ownership

Before mapping custom domain, verify ownership:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `evalgpt.com`
3. Choose DNS verification method
4. Add TXT record to your DNS:
   ```
   Host: @ (or blank)
   Type: TXT
   Value: google-site-verification=XXXXXXXXXX
   ```
5. Wait for verification (usually instant, max 48 hours)

## 9) Configure DNS Records

At your domain registrar (e.g., Namecheap), add these records:

**A Records (for evalgpt.com):**
```
Type: A
Host: @ (or blank)
Value: 216.239.32.21
TTL: Automatic

Type: A
Host: @ (or blank)
Value: 216.239.34.21
TTL: Automatic

Type: A
Host: @ (or blank)
Value: 216.239.36.21
TTL: Automatic

Type: A
Host: @ (or blank)
Value: 216.239.38.21
TTL: Automatic
```

**CNAME Record (for www.evalgpt.com):**
```
Type: CNAME
Host: www
Value: ghs.googlehosted.com.
TTL: Automatic
```

Wait 5-15 minutes for DNS propagation. Verify:
```bash
dig evalgpt.com +short
dig www.evalgpt.com +short
```

## 10) Map Custom Domain with SSL

```bash
# Create domain mappings with automatic SSL
gcloud app domain-mappings create evalgpt.com --certificate-management=AUTOMATIC
gcloud app domain-mappings create www.evalgpt.com --certificate-management=AUTOMATIC
```

## 11) Monitor SSL Certificate Provisioning

SSL certificates typically take 15-30 minutes to provision.

Create SSL status checker:
```bash
cat > check-ssl.sh << 'EOF'
#!/bin/bash
echo "Checking SSL certificate status..."
STATUS=$(gcloud app domain-mappings describe evalgpt.com --format="value(sslSettings.certificateId)")
if [ -z "$STATUS" ]; then
  echo "❌ SSL Certificate: PENDING"
  echo "   Certificate ID: $(gcloud app domain-mappings describe evalgpt.com --format='value(sslSettings.pendingManagedCertificateId)')"
  echo "   Try again in 5-10 minutes"
else
  echo "✅ SSL Certificate: ACTIVE"
  echo "   Certificate ID: $STATUS"
  echo "   HTTPS is now available at https://evalgpt.com"
fi
EOF
chmod +x check-ssl.sh
```

Check status:
```bash
./check-ssl.sh
```

Or view detailed status:
```bash
gcloud beta app ssl-certificates list
```

## 12) Verify Deployment

**Test HTTP (works immediately):**
```bash
curl -I http://evalgpt.com
```

**Test HTTPS (after SSL provisions):**
```bash
curl -I https://evalgpt.com
```

**Test API health:**
```bash
curl -i https://evalgpt.com/api/health
```

**Test binary_score endpoint:**
```bash
curl -s -X POST "https://evalgpt.com/api/evalprd/binary_score" \
  -H "Content-Type: application/json" \
  -d '{
    "prd_text": "# Test PRD\n\n## Problem\nUsers need metrics.\n\n## Solution\nDashboard.\n\n## Requirements\n- Real-time data\n\n## Success Criteria\n- Fast response"
  }' | jq '.readiness_gate'
```

**View logs:**
```bash
# Frontend logs
gcloud app logs tail -s default

# API logs
gcloud app logs tail -s api
```

## Troubleshooting

### SSL Certificate Stuck in FAILED_RETRYING_NOT_VISIBLE

If SSL certificates fail to provision:

1. Delete existing domain mappings:
   ```bash
   gcloud app domain-mappings delete evalgpt.com --quiet
   gcloud app domain-mappings delete www.evalgpt.com --quiet
   ```

2. Verify DNS is working:
   ```bash
   dig evalgpt.com +short
   curl -I http://evalgpt.com
   ```

3. Recreate domain mappings:
   ```bash
   gcloud app domain-mappings create evalgpt.com --certificate-management=AUTOMATIC
   gcloud app domain-mappings create www.evalgpt.com --certificate-management=AUTOMATIC
   ```

4. Wait 15-30 minutes for fresh provisioning

### Build Fails with "Permission Denied" on Artifact Registry

If Cloud Build fails with artifact registry permissions:

```bash
gcloud artifacts repositories add-iam-policy-binding us.gcr.io \
  --location=us \
  --member=serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com \
  --role=roles/artifactregistry.writer
```

### Frontend Shows Old Content

Browser cache issue. Clear with:
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Open in incognito/private window

### API Returns 500 or Timeouts

Check API logs:
```bash
gcloud app logs tail -s api --level=error
```

Common issues:
- OpenAI API key invalid/expired
- OpenAI quota exceeded
- API Gateway failed to start (check build logs)

## Architecture Summary

```
Internet
  ↓
Google Cloud Load Balancer (with SSL)
  ↓
dispatch.yaml routes requests:
  ├─ /api/* → api service (Standard, Node.js 20)
  │            └─ API Gateway (Fastify + OpenAI SDK)
  │                └─ OpenAI API (gpt-5)
  │
  └─ /* → default service (Standard, Node.js 20)
           └─ React SPA (Vite)
```

## Post-Deployment

- API keys are managed via `app.local.yaml` (never committed to git)
- Monitor costs in Cloud Console
- Set up budget alerts
- Configure log-based metrics for monitoring
- Enable Cloud CDN for better performance (optional)

## Quick Redeploy Commands

**Update frontend only:**
```bash
cd frontend && npm run build && cd ..
gcloud app deploy frontend/app.yaml --quiet
```

**Update API only:**
```bash
cd api-gateway && npm run build && cd ..
gcloud app deploy cloud/app.yaml cloud/app.local.yaml --quiet
```

**Update both services:**
```bash
cd frontend && npm run build && cd ..
cd api-gateway && npm run build && cd ..
gcloud app deploy cloud/app.yaml cloud/app.local.yaml frontend/app.yaml --quiet
```

**Update dispatch rules:**
```bash
gcloud app deploy cloud/dispatch.yaml --quiet
```
