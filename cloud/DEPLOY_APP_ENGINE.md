# Deploy the PRD Judge public beta

Live evaluation uses three services:

1. private Cloud Run service: Python PRD Judge runtime;
2. public Cloud Run service: Fastify streaming gateway;
3. App Engine default service: React frontend.

The gateway must not run on App Engine Standard. App Engine buffers dynamic
responses until the handler completes, which prevents real SSE progress from
reaching the browser. Cloud Run preserves the incremental progress stream.

Do not deploy from the old detached workspace. Use a clean branch/worktree. Live evaluation must stop if `cloud/RELEASE_GATES.md` is not satisfied.

## Fail-closed public information preview

The frontend can be promoted without changing the runtime, API service, routing, or secrets when the narrower public-preview gates pass. The build must leave `VITE_PUBLIC_EVALUATIONS_ENABLED` unset or set it to exactly `false`; any other value except the exact string `true` remains closed.

    cd frontend
    rm -f .env.production.local
    VITE_PUBLIC_EVALUATIONS_ENABLED=false npm run build
    npm run test:browser:public
    gcloud app deploy app.yaml \
      --project "$PROJECT_ID" \
      --version "$RELEASE_ID" \
      --no-promote \
      --quiet

Inspect that exact version with Fable, confirm that no file input, text area, or evaluate action is present, and then canary only the App Engine default service at 10, 50, and 100 percent. Leave the API service traffic unchanged. This public information preview does not authorize document evaluation.

## 1. Verify live state before changing it

Never assume the historical project ID in older documents is still authoritative.

    gcloud auth login
    gcloud auth application-default login
    gcloud config list
    gcloud projects describe "$PROJECT_ID"
    gcloud app describe --project "$PROJECT_ID"
    gcloud app services list --project "$PROJECT_ID"
    gcloud app versions list --project "$PROJECT_ID"
    gcloud app domain-mappings list --project "$PROJECT_ID"
    gcloud run services list --region "$REGION" --project "$PROJECT_ID"

Record the current frontend version and gateway revision as the rollback target.
Capture the actual App Engine hostname instead of deriving it from a remembered
project convention:

    export APP_HOST="$(gcloud app describe --project "$PROJECT_ID" --format='value(defaultHostname)')"
    export GATEWAY_SA="evalgpt-api-gateway@$PROJECT_ID.iam.gserviceaccount.com"
    test -n "$GATEWAY_SA" && test -n "$APP_HOST"

## 2. Build and deploy the private runtime

Set a unique release identifier and the exact model that won the adjudicated bakeoff.

    export RELEASE_ID="prd-judge-beta-$(git rev-parse --short HEAD)"
    export IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/evalgpt/prd-judge-runtime:$RELEASE_ID"
    export APPROVED_MODEL="<validated-model-id>"
    export APPROVED_JUDGE_COMMIT="675063d05c414af7e6982dfa4a6c194c399c2ab8"
    export APPROVED_JUDGE_MANIFEST="0720fd773155ba13b702e469607d37247ea00d2bb001ca47a82adf6fdd0b0c85"
    # Remain false until the separate PRD Score release gate passes.
    export PRD_SCORE_ENABLED="false"

Create or identify a least-privilege runtime service account. Give it access only to the Anthropic API key secret.

    gcloud builds submit judge-runtime --tag "$IMAGE" --project "$PROJECT_ID"

    gcloud run deploy prd-judge-runtime \
      --image "$IMAGE" \
      --region "$REGION" \
      --project "$PROJECT_ID" \
      --service-account "prd-judge-runtime@$PROJECT_ID.iam.gserviceaccount.com" \
      --no-allow-unauthenticated \
      --set-secrets "ANTHROPIC_API_KEY=evalgpt-anthropic-api-key:latest" \
      --set-env-vars "JUDGE_RUNTIME_MODE=model,PRD_JUDGE_MODEL=$APPROVED_MODEL,PRD_JUDGE_ALLOWED_MODELS=$APPROVED_MODEL,PRD_JUDGE_EXPECTED_SOURCE_COMMIT=$APPROVED_JUDGE_COMMIT,PRD_JUDGE_EXPECTED_MANIFEST_SHA256=$APPROVED_JUDGE_MANIFEST,PRD_SCORE_ENABLED=$PRD_SCORE_ENABLED,PRD_JUDGE_MODEL_TIMEOUT_SECONDS=120,LOG_LEVEL=INFO" \
      --memory 2Gi \
      --timeout 600 \
      --concurrency 8 \
      --max-instances 10

Capture the service URL:

    export RUNTIME_URL="$(gcloud run services describe prd-judge-runtime --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"

When the exact PRD Score candidate passes its release gate, set
`PRD_SCORE_ENABLED=true` and add its approved model, allowlist, source commit,
and manifest variables to the same deploy command. Do not reuse the Judge model
identifier merely because it is already approved for the different instrument.

Grant only the dedicated gateway service account permission to invoke it:

    gcloud run services add-iam-policy-binding prd-judge-runtime \
      --region "$REGION" \
      --project "$PROJECT_ID" \
      --member "serviceAccount:$GATEWAY_SA" \
      --role roles/run.invoker

## 3. Configure the gateway without secrets in source

Build and deploy the gateway as its own public Cloud Run service. The gateway
has no model key; it uses its service account identity to invoke the private
runtime.

    export FRONTEND_PREVIEW_URL="https://$RELEASE_ID-dot-$APP_HOST"
    export GATEWAY_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/evalgpt/api-gateway:$RELEASE_ID"
    gcloud builds submit api-gateway --tag "$GATEWAY_IMAGE" --project "$PROJECT_ID"
    gcloud run deploy evalgpt-api-gateway \
      --image "$GATEWAY_IMAGE" \
      --region "$REGION" \
      --project "$PROJECT_ID" \
      --service-account "$GATEWAY_SA" \
      --allow-unauthenticated \
      --timeout 600 \
      --concurrency 8 \
      --max-instances 10 \
      --set-env-vars "ALLOWED_ORIGIN=https://evalgpt.com,$FRONTEND_PREVIEW_URL,TRUST_PROXY_HOPS=2,RATE_LIMIT_MAX=5,RATE_LIMIT_WINDOW_MS=3600000,DAILY_RUN_LIMIT=100,EVALUATIONS_ENABLED=true,EVALUATION_TIMEOUT_MS=570000,USE_GOOGLE_IDENTITY_TOKEN=true,PRD_JUDGE_RUNTIME_URL=$RUNTIME_URL,PRD_JUDGE_RUNTIME_AUDIENCE=$RUNTIME_URL"

    export GATEWAY_URL="$(gcloud run services describe evalgpt-api-gateway \
      --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"

## 4. Build and test the exact release

    cd judge-runtime
    JUDGE_RUNTIME_MODE=fixture .venv/bin/python -m pytest -q
    cd ../api-gateway
    npm ci
    npm audit
    npm run type-check
    npm test
    cd ../frontend
    npm ci
    npm audit
    npm run type-check
    npm run build
    cd ..
    node tests/smoke.mjs

Run the approved-model evaluation suite separately. Fixture mode proves integration, not judgment quality.

## 5. Deploy preview versions without traffic

Bind the preview frontend build to the exact Cloud Run gateway revision. This
file is ignored by Git but intentionally included in the preview build context:

    printf 'VITE_API_BASE=%s\n' "$GATEWAY_URL" > frontend/.env.production.local

    gcloud app deploy frontend/app.yaml \
      --project "$PROJECT_ID" \
      --version "$RELEASE_ID" \
      --no-promote \
      --quiet

Open the version-specific frontend and gateway URLs. Verify /api/health returns status ok, the pinned judge commit/manifest, the exact approved model, the pinned PRD Score commit/manifest, the PRD Score model/calculation version, and the expected `prd_score_enabled` value.

Complete the fresh-context Fable pixel review against this preview before traffic changes.

## 6. Canary and rollback

Record OLD_FRONTEND and OLD_GATEWAY_REVISION before splitting traffic. During
canary, the new frontend calls the exact Cloud Run gateway using
`VITE_API_BASE`; the old production frontend remains unchanged.

Advance only while the release gates remain green:

    # 10 percent
    gcloud app services set-traffic default --splits "$OLD_FRONTEND=0.90,$RELEASE_ID=0.10" --split-by=random --migrate --project "$PROJECT_ID"

    # Then 50 percent, then 100 percent after the observation windows. These
    # users exercise the exact new API URL embedded in the new frontend.
    gcloud app services set-traffic default --splits "$OLD_FRONTEND=0.50,$RELEASE_ID=0.50" --split-by=random --migrate --project "$PROJECT_ID"
    gcloud app services set-traffic default --splits "$RELEASE_ID=1" --migrate --project "$PROJECT_ID"

After the exact-pair canary reaches 100 percent and the observation window
passes, retain the explicit `VITE_API_BASE=$GATEWAY_URL` build setting. Do not
return the frontend to the App Engine `/api` service because that route buffers
the stream.

Rollback is immediate:

    gcloud app services set-traffic default --splits "$OLD_FRONTEND=1" --migrate --project "$PROJECT_ID"
    gcloud run services update-traffic evalgpt-api-gateway \
      --region "$REGION" --project "$PROJECT_ID" \
      --to-revisions "$OLD_GATEWAY_REVISION=100"

Also set `EVALUATIONS_ENABLED=false` on the gateway or remove the Cloud Run invoker binding if a privacy, evidence, or false-GO incident requires a hard stop. `DAILY_RUN_LIMIT` is an abuse-control ceiling per gateway instance, not the emergency switch.

## 7. Production verification

Verify:

- homepage metadata and public-beta label;
- file and paste evaluation;
- PDF/DOCX extraction warnings;
- result hierarchy and exports;
- mobile/narrow layout and keyboard navigation;
- security headers from frontend/serve.json on served frontend responses;
- no auth, payment, saved-history, or Firestore routes;
- content-free logs;
- /api/health;
- completion rate, 5xx rate, p95 latency, model version, judge version, and cost per run.

Do not claim certified or generally available until the frozen family-separated validation report exists for the exact deployed versions.
