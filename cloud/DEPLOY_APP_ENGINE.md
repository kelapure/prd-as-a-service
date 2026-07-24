# Deploy Workspace-restricted EvalGPT

EvalGPT has three services:

1. private Cloud Run service: Python PRD Judge and mandatory PRD Score runtime;
2. public Cloud Run service: authenticated Fastify streaming gateway;
3. App Engine default service: React frontend.

The Cloud Run gateway stays publicly invokable so browsers can reach it, but every product route verifies a Google ID token. Only `/health` and `/api/health` are unauthenticated and content-free. Never make the private runtime public.

## 1. Verify live state and rollback targets

Use a clean worktree and verify the real project before changing it.

```bash
gcloud auth login
gcloud auth application-default login
gcloud config list
gcloud projects describe "$PROJECT_ID"
gcloud app describe --project "$PROJECT_ID"
gcloud app versions list --project "$PROJECT_ID"
gcloud app services list --project "$PROJECT_ID"
gcloud app domain-mappings list --project "$PROJECT_ID"
gcloud run services list --region "$REGION" --project "$PROJECT_ID"

export APP_HOST="$(gcloud app describe \
  --project "$PROJECT_ID" --format='value(defaultHostname)')"
export GATEWAY_SA="evalgpt-api-gateway@$PROJECT_ID.iam.gserviceaccount.com"
export OLD_FRONTEND="$(gcloud app versions list \
  --service default --project "$PROJECT_ID" \
  --filter='traffic_split>0' --format='value(version.id)' | head -1)"
export OLD_GATEWAY_REVISION="$(gcloud run services describe evalgpt-api-gateway \
  --region "$REGION" --project "$PROJECT_ID" \
  --format='value(status.traffic[0].revisionName)')"
```

Record those values in the release issue.

## 2. Create the internal Google OAuth client

In Google Cloud Console, configure the OAuth consent screen as **Internal** for the `8090.inc` organization. Create a **Web application** OAuth client for Google Identity Services.

Authorized JavaScript origins must include:

- `https://evalgpt.com`
- the exact App Engine preview origin for this release;
- `http://localhost:3000` for local development.

Do not add `dfyautomation.io`, Gmail, wildcard domains, subdomains, or redirect URIs that are not used. The browser receives only the OAuth client ID; it does not use or ship a client secret.

```bash
export GOOGLE_OAUTH_CLIENT_ID="<internal-web-client>.apps.googleusercontent.com"
export RELEASE_ID="evalgpt-$(git rev-parse --short HEAD)"
export FRONTEND_PREVIEW_URL="https://$RELEASE_ID-dot-$APP_HOST"
```

Add `FRONTEND_PREVIEW_URL` to the client's authorized JavaScript origins before deploying the preview.

## 3. Create the quota-only Firestore database

EvalGPT uses Firestore Native in `us-central1` only for pseudonymous counters and concurrency leases.

```bash
gcloud services enable firestore.googleapis.com \
  --project "$PROJECT_ID"

# Run once. If (default) already exists, inspect it instead of creating another database.
gcloud firestore databases create \
  --database='(default)' \
  --location=us-central1 \
  --type=firestore-native \
  --project "$PROJECT_ID"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$GATEWAY_SA" \
  --role=roles/datastore.user

gcloud firestore fields ttls update expiresAt \
  --collection-group=evalgpt_quota_users \
  --enable-ttl \
  --database='(default)' \
  --project "$PROJECT_ID"

gcloud firestore fields ttls update expiresAt \
  --collection-group=evalgpt_quota \
  --enable-ttl \
  --database='(default)' \
  --project "$PROJECT_ID"
```

Create a high-entropy HMAC secret. If the secret already exists, add a new version instead of recreating it.

```bash
openssl rand -base64 48 | gcloud secrets create evalgpt-quota-hmac-key \
  --replication-policy=automatic \
  --data-file=- \
  --project "$PROJECT_ID"

gcloud secrets add-iam-policy-binding evalgpt-quota-hmac-key \
  --member="serviceAccount:$GATEWAY_SA" \
  --role=roles/secretmanager.secretAccessor \
  --project "$PROJECT_ID"
```

Do not inspect or log the secret. Rotating it starts a new pseudonymous quota namespace, so rotate only through an explicit capacity-reset procedure.

## 4. Verify the private Judge and PRD Score runtime

The runtime remains IAM-protected. Both instruments must be enabled and pinned independently.

```bash
export RUNTIME_URL="$(gcloud run services describe prd-judge-runtime \
  --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"

gcloud run services add-iam-policy-binding prd-judge-runtime \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --member="serviceAccount:$GATEWAY_SA" \
  --role=roles/run.invoker
```

Verify the runtime health response reports:

- `configured: true`;
- the approved Judge model, source commit, and manifest;
- `prd_score_enabled: true`;
- the approved PRD Score model, source commit, manifest, and calculation version.

Do not continue if PRD Score is disabled or either model/bundle pin differs from the reviewed release.

## 5. Deploy the auth-capable gateway with enforcement off

This first revision supports `/api/access`, token verification, and Firestore quotas, while the existing frontend is still serving traffic.

```bash
export GATEWAY_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/evalgpt/api-gateway:$RELEASE_ID"
gcloud builds submit api-gateway \
  --tag "$GATEWAY_IMAGE" \
  --project "$PROJECT_ID"

gcloud run deploy evalgpt-api-gateway \
  --image "$GATEWAY_IMAGE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --service-account "$GATEWAY_SA" \
  --allow-unauthenticated \
  --timeout 600 \
  --concurrency 8 \
  --max-instances 10 \
  --set-secrets "QUOTA_IDENTITY_HMAC_KEY=evalgpt-quota-hmac-key:latest" \
  --set-env-vars "ALLOWED_ORIGIN=https://evalgpt.com,$FRONTEND_PREVIEW_URL,WORKSPACE_AUTH_REQUIRED=false,GOOGLE_OAUTH_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID,GOOGLE_WORKSPACE_DOMAIN=8090.inc,USER_DAILY_RUN_LIMIT=3,USER_MONTHLY_RUN_LIMIT=10,GLOBAL_DAILY_RUN_LIMIT=50,GLOBAL_CONCURRENT_RUN_LIMIT=2,QUOTA_LEASE_MS=720000,QUOTA_TTL_MS=7776000000,ACCESS_RATE_LIMIT_MAX=60,ACCESS_RATE_LIMIT_WINDOW_MS=60000,EVALUATE_RATE_LIMIT_MAX=20,EVALUATE_RATE_LIMIT_WINDOW_MS=600000,TRUST_PROXY_HOPS=2,EVALUATIONS_ENABLED=true,EVALUATION_TIMEOUT_MS=570000,USE_GOOGLE_IDENTITY_TOKEN=true,PRD_JUDGE_RUNTIME_URL=$RUNTIME_URL,PRD_JUDGE_RUNTIME_AUDIENCE=$RUNTIME_URL"

export GATEWAY_URL="$(gcloud run services describe evalgpt-api-gateway \
  --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
```

At this stage, `/api/access` must work with an 8090 token, but the old frontend can still submit anonymously. Keep this transition short.

## 6. Build and deploy the authenticated frontend preview

```bash
cd frontend
rm -f .env.production.local
cat > .env.production.local <<EOF
VITE_PUBLIC_EVALUATIONS_ENABLED=true
VITE_WORKSPACE_AUTH_REQUIRED=true
VITE_GOOGLE_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID
VITE_API_BASE=$GATEWAY_URL
EOF

npm ci
npm audit
npm run type-check
npm run test:browser

gcloud app deploy app.yaml \
  --project "$PROJECT_ID" \
  --version "$RELEASE_ID" \
  --no-promote \
  --quiet
```

Against the exact preview:

- an anonymous visitor sees only the 8090 sign-in gate;
- a verified `@8090.inc` account sees the product and quota status;
- Gmail, `dfyautomation.io`, missing-`hd`, aliases, and subdomains are denied;
- ID tokens do not enter local or session storage;
- selected documents survive token-expiry reauthentication;
- Judge and PRD Score both execute and the result remains correctly ordered;
- no PRD content, email, token, finding, evidence, or filename appears in logs or Firestore.

Run the required fresh-context Fable review against the deployed preview. Resolve every P0/P1 and rerun. If Fable is unavailable, use Opus 5 at xhigh effort and keep release blocked on every P0/P1.

## 7. Canary the authenticated frontend

Advance only after each observation window remains healthy.

```bash
gcloud app services set-traffic default \
  --splits "$OLD_FRONTEND=0.90,$RELEASE_ID=0.10" \
  --split-by=random --migrate --project "$PROJECT_ID"

gcloud app services set-traffic default \
  --splits "$OLD_FRONTEND=0.50,$RELEASE_ID=0.50" \
  --split-by=random --migrate --project "$PROJECT_ID"

gcloud app services set-traffic default \
  --splits "$RELEASE_ID=1" \
  --migrate --project "$PROJECT_ID"
```

## 8. Cut over mandatory gateway authentication

After the authenticated frontend reaches 100 percent, enable gateway enforcement in one cutover:

```bash
gcloud run services update evalgpt-api-gateway \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --update-env-vars "WORKSPACE_AUTH_REQUIRED=true"
```

Verify immediately:

```bash
curl -i -X POST "$GATEWAY_URL/api/prd-judge/evaluate"
# 401 with code=auth_required
```

Then verify with real browser sessions that:

- an 8090 account succeeds;
- an external Google account receives `403 workspace_not_allowed`;
- quota counts remain consistent across multiple gateway revisions/instances;
- the fourth daily and eleventh monthly user starts are rejected;
- the fifty-first global daily start is rejected;
- a third simultaneous evaluation receives `429 capacity_busy`;
- Firestore outage returns `503 quota_store_unavailable`;
- `/api/health` remains unauthenticated and content-free.

## 9. Failure policy

Never restore anonymous evaluation access. On authentication, quota, privacy, Judge, PRD Score, or model-capacity failure, stop evaluations:

```bash
gcloud run services update evalgpt-api-gateway \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --update-env-vars "EVALUATIONS_ENABLED=false"
```

Frontend rollback is permitted only if the rollback version is also Workspace-gated. Runtime and gateway revision rollback must preserve mandatory authentication, Firestore quotas, and mandatory PRD Score.
