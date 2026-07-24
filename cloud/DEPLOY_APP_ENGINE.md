# Deploy the PRD Judge public beta

The beta uses three services:

1. private Cloud Run service: Python PRD Judge runtime;
2. App Engine api service: same-origin Fastify gateway;
3. App Engine default service: React frontend.

Do not deploy from the old detached workspace. Use a clean branch/worktree and stop if cloud/RELEASE_GATES.md is not satisfied.

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

Record the current default/api versions and traffic splits as the rollback target.
Capture the actual App Engine service account and hostname instead of deriving them
from a remembered project convention:

    export APP_ENGINE_SA="$(gcloud app describe --project "$PROJECT_ID" --format='value(serviceAccount)')"
    export APP_HOST="$(gcloud app describe --project "$PROJECT_ID" --format='value(defaultHostname)')"
    test -n "$APP_ENGINE_SA" && test -n "$APP_HOST"

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

Grant only the verified App Engine service account permission to invoke it:

    gcloud run services add-iam-policy-binding prd-judge-runtime \
      --region "$REGION" \
      --project "$PROJECT_ID" \
      --member "serviceAccount:$APP_ENGINE_SA" \
      --role roles/run.invoker

## 3. Configure the gateway without secrets in source

Derive the version-specific preview origins. They are used only to bind the
preview frontend to the exact preview gateway during Fable and canary review.

    export FRONTEND_PREVIEW_URL="https://$RELEASE_ID-dot-$APP_HOST"
    export API_PREVIEW_URL="https://$RELEASE_ID-dot-api-dot-$APP_HOST"

Copy api-gateway/app.yaml to the git-ignored api-gateway/app.local.yaml and add
the runtime URL. Set `ALLOWED_ORIGIN` to both the production and exact preview
frontend origins:

    env_variables:
      PRD_JUDGE_RUNTIME_URL: "<RUNTIME_URL>"
      PRD_JUDGE_RUNTIME_AUDIENCE: "<RUNTIME_URL>"
      ALLOWED_ORIGIN: "https://evalgpt.com,<FRONTEND_PREVIEW_URL>"

Keep the other environment variables from the tracked file. The gateway obtains an IAM identity token from the App Engine service account. It does not need the model API key.

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

    gcloud app deploy api-gateway/app.local.yaml \
      --project "$PROJECT_ID" \
      --version "$RELEASE_ID" \
      --no-promote \
      --quiet

Bind the preview frontend build to the exact API version. This file is ignored
by Git but intentionally included in the preview build context:

    printf 'VITE_API_BASE=%s\n' "$API_PREVIEW_URL" > frontend/.env.production.local

    gcloud app deploy frontend/app.yaml \
      --project "$PROJECT_ID" \
      --version "$RELEASE_ID" \
      --no-promote \
      --quiet

    gcloud app deploy cloud/dispatch.yaml --project "$PROJECT_ID" --quiet

Open the version-specific frontend and API URLs. Verify /api/health returns status ok, the pinned judge commit/manifest, the exact approved model, the pinned PRD Score commit/manifest, the PRD Score model/calculation version, and the expected `prd_score_enabled` value.

Complete the fresh-context Fable pixel review against this preview before traffic changes.

## 6. Canary and rollback

Record OLD_FRONTEND and OLD_API before splitting traffic. During canary, the new
frontend calls the exact new API version using `VITE_API_BASE`; old production
pages continue using the old API service at 100 percent. This prevents an old UI
from ever reaching the breaking public-beta API contract.

Advance only while the release gates remain green:

    # 10 percent
    gcloud app services set-traffic default --splits "$OLD_FRONTEND=0.90,$RELEASE_ID=0.10" --split-by=random --migrate --project "$PROJECT_ID"

    # Then 50 percent, then 100 percent after the observation windows. These
    # users exercise the exact new API URL embedded in the new frontend.
    gcloud app services set-traffic default --splits "$OLD_FRONTEND=0.50,$RELEASE_ID=0.50" --split-by=random --migrate --project "$PROJECT_ID"
    gcloud app services set-traffic default --splits "$RELEASE_ID=1" --migrate --project "$PROJECT_ID"

After the exact-pair canary reaches 100 percent and the observation window
passes, point the API service at the already-canary-tested gateway version.
Then remove the preview API override and deploy one final frontend version. That
final build returns the browser to the required same-origin `/api` gateway:

    gcloud app services set-traffic api --splits "$RELEASE_ID=1" --migrate --project "$PROJECT_ID"
    rm -f frontend/.env.production.local
    export FINAL_FRONTEND_VERSION="$RELEASE_ID-final"
    gcloud app deploy frontend/app.yaml --project "$PROJECT_ID" --version "$FINAL_FRONTEND_VERSION" --no-promote --quiet
    gcloud app services set-traffic default --splits "$FINAL_FRONTEND_VERSION=1" --migrate --project "$PROJECT_ID"

Rollback is immediate:

    gcloud app services set-traffic default --splits "$OLD_FRONTEND=1" --migrate --project "$PROJECT_ID"
    gcloud app services set-traffic api --splits "$OLD_API=1" --migrate --project "$PROJECT_ID"

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
