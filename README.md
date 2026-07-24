# EvalGPT PRD Judge

EvalGPT is an internal 8090 product for deciding whether a PRD is ready to build. The entire experience requires a verified Google Workspace identity whose hosted-domain claim is exactly `8090.inc`.

Google ID tokens live only in React memory. EvalGPT has no profiles, saved evaluations, payment, or persistent sharing. Firestore stores only HMAC-pseudonymous quota counters and short-lived concurrency leases; PRD files, extracted text, findings, evidence, filenames, email addresses, and tokens never enter application storage.

## Product contract

- Primary judgment: GO, REVISE, HOLD, WRONG_ARTIFACT, or DISQUALIFY_UNTIL_ARCHITECTURE_AUDIT.
- Readiness score: a deterministic `/10` projection from the validated Judge report. The model never emits, sees, or averages the number.
- Draft strength: PRD Score independently evaluates the same supplied evidence against its absolute-mode rubric and applies deterministic arithmetic to model-owned criterion ratings. It never changes the verdict or readiness score.
- Evidence: every status=used quote is verified against the uploaded PRD or supplied evidence before a score is computed.
- Secondary diagnostic: PRD Eval Rubric v2, C1-C12. It never overrides the judge verdict.
- Privacy: Workspace authentication adds access control, not an EvalGPT account. Inputs and results remain in process/browser memory for the active run only.
- Model safety: one release-bakeoff winner is allowlisted. There is no automatic fallback to an unvalidated model.

## Architecture

    React/Vite frontend
            |
            | Google ID token + multipart + streamed progress
            v
    Fastify public API gateway (Cloud Run)
            |
            | verified hd=8090.inc + Firestore quota transaction
            |
            | IAM identity token + optional internal token
            v
    Python PRD evaluation runtime (private Cloud Run)
            |
            | exact pinned Judge and PRD Score bundles + approved models
            v
    Judge verdict + readiness /10
    independent PRD Score draft strength /100 or /115
    independent C1-C12 coverage diagnostic

### Components

- frontend/ — 8090-branded Workspace sign-in gate, in-memory credential handling, quota and reauthentication states, progressive result disclosure, and browser-side HTML/PDF/JSON exports.
- api-gateway/ — Google token validation before multipart parsing, Firestore-backed quotas, content-free logging, upload limits, route-specific IP rate limits, kill switch, cancellation, health checks, and SSE proxying.
- judge-runtime/ — in-memory PDF/DOCX/Markdown/text extraction, figure/page support, isolated Judge/rubric/PRD Score model calls, canonical validators, and deterministic calculations.
- judge-runtime/bundle/ — integrity-checked snapshots exported from `salesfactory-agents/prd_judge` and `salesfactory-agents/prd_score`, each with a source commit and file hashes.
- tests/ — contract fixtures and full local-stack smoke test.

The retired `/api/evalprd/*`, Stripe, profile, saved-evaluation, and document-history routes remain absent. `GET /api/access` is the only identity-facing product endpoint and returns the verified work email plus quota status.

## Local development

Prerequisites: Node.js 20+, Python 3.12.

    # Terminal 1: internal runtime without model spend
    cd judge-runtime
    python3 -m venv .venv
    .venv/bin/pip install -r requirements-dev.txt
    JUDGE_RUNTIME_MODE=fixture .venv/bin/uvicorn app.main:app --port 8092

    # Terminal 2: API gateway
    cd api-gateway
    npm install
    WORKSPACE_AUTH_REQUIRED=false \
      PRD_JUDGE_RUNTIME_URL=http://127.0.0.1:8092 npm run dev

    # Terminal 3: frontend
    cd frontend
    npm install
    VITE_PUBLIC_EVALUATIONS_ENABLED=true \
      VITE_WORKSPACE_AUTH_REQUIRED=false npm run dev

Open http://localhost:3000. This explicitly disabled local-auth configuration is for fixture development only. Deployed previews and production must use `WORKSPACE_AUTH_REQUIRED=true`, `VITE_WORKSPACE_AUTH_REQUIRED=true`, the internal Google OAuth client ID, Firestore, and the quota HMAC secret.

## Model-backed runtime

Model-backed Judge mode fails closed until the release-bakeoff winner is explicitly configured. PRD Score is a mandatory part of EvalGPT and must be enabled with its own pinned, approved model and bundle:

    export ANTHROPIC_API_KEY=...
    export PRD_JUDGE_MODEL=<validated-model-id>
    export PRD_JUDGE_ALLOWED_MODELS=<same-validated-model-id>
    export PRD_JUDGE_EXPECTED_SOURCE_COMMIT=<reviewed-canonical-commit>
    export PRD_JUDGE_EXPECTED_MANIFEST_SHA256=<reviewed-runtime-manifest>
    export PRD_SCORE_ENABLED=true
    export PRD_SCORE_MODEL=<validated-score-model-id>
    export PRD_SCORE_ALLOWED_MODELS=<same-validated-score-model-id>
    export PRD_SCORE_EXPECTED_SOURCE_COMMIT=<reviewed-canonical-score-commit>
    export PRD_SCORE_EXPECTED_MANIFEST_SHA256=<reviewed-score-runtime-manifest>
    judge-runtime/.venv/bin/uvicorn app.main:app --port 8092

If either model is absent from its allowlist, either bundle pin does not match, or PRD Score is disabled, the deployed release is not eligible for traffic. Every Judge, rubric, and PRD Score call requires schema-enforced structured output. The Judge remains authoritative and the instruments are never mathematically blended. No model fallback is used. Every report returns both instrument versions and pins.

## Checks

    # Canonical judge
    cd ../salesfactory-agents/prd_judge
    python3 -m unittest discover -s scripts -p 'test_*.py' -v

    # Runtime
    cd judge-runtime
    JUDGE_RUNTIME_MODE=fixture .venv/bin/python -m pytest -q

    # Gateway
    cd api-gateway
    npm audit
    npm run type-check
    npm test

    # Frontend
    cd frontend
    npm audit
    npm run type-check
    npm run build
    npm run test:browser
    node tests/score-envelope-guard.mjs
    npm run test:full-flow

    # Full fixture-backed stack
    node tests/smoke.mjs

    # Exact canonical bundle conformance
    judge-runtime/.venv/bin/python tests/check_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_judge
    judge-runtime/.venv/bin/python tests/check_score_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_score

## Input and API limits

POST /api/prd-judge/evaluate accepts multipart input:

- `Authorization: Bearer <Google ID token>` from the configured OAuth client;
- exactly one prd file or prd_text field;
- up to five supporting_files;
- PDF, DOCX, Markdown, and TXT only;
- 25 MB combined;
- 200 known pages across the supplied documents;
- 250,000 pasted characters and 250,000 extracted characters per document;
- at most 12 rendered pages or embedded figures per document, size-bounded before the model call; oversized or unreadable figures are skipped with a warning.

The streamed response emits progress, complete, or error events. The final envelope is `evalgpt-prd-judge/v2`; the frontend fails closed and asks the user to reload if a complete event carries any other envelope version. A production completion must contain a validated PRD Score report with `status=complete` or `status=not_scored`; the runtime and frontend reject missing reports and the retired `unavailable` partial-result shape. The top-level `report`, `readiness_score`, `rubric`, and `prd_score` fields remain separate; consumers must not average, blend, or use PRD Score to rewrite the Judge verdict.

`GET /api/access` requires the same bearer token and returns the verified work email plus daily and monthly quota windows. The gateway admits at most three starts per user per UTC day, ten per calendar month, fifty organization-wide per UTC day, and two concurrent evaluations. Every admitted start counts even if it is cancelled or fails downstream. Abandoned leases expire after twelve minutes.

## Deployment

See `cloud/DEPLOY_APP_ENGINE.md` for Google OAuth, Firestore, the private runtime, the streaming Cloud Run gateway, and the App Engine frontend deployment path. See `cloud/RELEASE_GATES.md` for authentication, quota, model, evidence, Fable, accessibility, canary, monitoring, and rollback gates.

The gateway runs on Cloud Run because App Engine Standard buffers dynamic
responses and cannot deliver the product's real SSE progress events. The
App Engine frontend uses the supported Node.js 24 runtime. Its production
security headers live in `frontend/serve.json`, because App Engine does not
allow `http_headers` on the dynamic Node.js script handler.

The Fable review record, including the fresh-context passes against the version-specific deployed preview, is in docs/FABLE_UX_REVIEW.md. That UX pass does not clear the non-UX certification gates in cloud/RELEASE_GATES.md.

Do not put model keys or internal tokens in tracked YAML. Use Secret Manager. Verify the active GCP project, service accounts, domain mapping, and rollback version before changing production traffic.
