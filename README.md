# EvalGPT PRD Judge

EvalGPT is a free, anonymous public-beta product for deciding whether a PRD is ready to build. It returns an evidence-backed PRD Judge verdict, a deterministic readiness score, a prioritized path to GO, and the secondary 12-criterion PRD Eval Rubric v2.

Production remains at https://evalgpt.com. The public-beta implementation in this branch must not be promoted until the release gates in cloud/RELEASE_GATES.md pass.

## Product contract

- Primary judgment: GO, REVISE, HOLD, WRONG_ARTIFACT, or DISQUALIFY_UNTIL_ARCHITECTURE_AUDIT.
- Score: a deterministic projection from the validated report. The model never emits, sees, or averages the number.
- Evidence: every status=used quote is verified against the uploaded PRD or supplied evidence before a score is computed.
- Secondary diagnostic: PRD Eval Rubric v2, C1-C12. It never overrides the judge verdict.
- Privacy: the beta has no accounts, payment, saved history, persistent share links, or document storage. Inputs and results remain in process/browser memory for the active run only.
- Model safety: one release-bakeoff winner is allowlisted. There is no automatic fallback to an unvalidated model.

## Architecture

    React/Vite frontend
            |
            | multipart + streamed progress
            v
    Fastify same-origin API gateway (App Engine)
            |
            | IAM identity token + optional internal token
            v
    Python PRD Judge runtime (private Cloud Run)
            |
            | exact pinned judge bundle + approved model
            v
    Validated report -> deterministic score -> independent C1-C12 diagnostic

### Components

- frontend/ — 8090-branded responsive product experience, upload/paste flow, progressive result disclosure, and browser-side HTML/PDF/JSON exports.
- api-gateway/ — content-free logging, upload limits, CORS, rate limits, daily kill switch, cancellation, health checks, and SSE proxying.
- judge-runtime/ — in-memory PDF/DOCX/Markdown/text extraction, figure/page support, isolated judge/rubric model calls, canonical validator, and deterministic score.
- judge-runtime/bundle/ — integrity-checked snapshot exported from salesfactory-agents/prd_judge with source commit and file hashes.
- tests/ — contract fixtures and full local-stack smoke test.

The retired /api/evalprd/*, authentication, Stripe, Firestore, and saved-evaluation routes are intentionally absent from the public beta.

## Local development

Prerequisites: Node.js 20+, Python 3.12.

    # Terminal 1: internal runtime without model spend
    cd judge-runtime
    python3 -m venv .venv
    .venv/bin/pip install -r requirements-dev.txt
    JUDGE_RUNTIME_MODE=fixture .venv/bin/uvicorn app.main:app --port 8092

    # Terminal 2: same-origin gateway
    cd api-gateway
    npm install
    PRD_JUDGE_RUNTIME_URL=http://127.0.0.1:8092 npm run dev

    # Terminal 3: frontend
    cd frontend
    npm install
    npm run dev

Open http://localhost:3000. Fixture mode exercises the complete upload, streaming, validation, score, rubric, and export path without calling a model.

## Model-backed runtime

Model-backed mode fails closed until the release-bakeoff winner is explicitly configured:

    export ANTHROPIC_API_KEY=...
    export PRD_JUDGE_MODEL=<validated-model-id>
    export PRD_JUDGE_ALLOWED_MODELS=<same-validated-model-id>
    export PRD_JUDGE_EXPECTED_SOURCE_COMMIT=<reviewed-canonical-commit>
    export PRD_JUDGE_EXPECTED_MANIFEST_SHA256=<reviewed-runtime-manifest>
    judge-runtime/.venv/bin/uvicorn app.main:app --port 8092

If the configured model is absent from the allowlist, /health is degraded and evaluations do not run. The model identifier, judge version, source commit, bundle manifest, rubric version, and score function version are returned in every report.

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
    npm run test:full-flow

    # Full fixture-backed stack
    node tests/smoke.mjs

    # Exact canonical bundle conformance
    judge-runtime/.venv/bin/python tests/check_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_judge

## Input and API limits

POST /api/prd-judge/evaluate accepts multipart input:

- exactly one prd file or prd_text field;
- up to five supporting_files;
- PDF, DOCX, Markdown, and TXT only;
- 25 MB combined;
- 200 known pages across the supplied documents;
- 250,000 pasted characters and 250,000 extracted characters per document;
- at most 12 rendered pages or embedded figures per document, size-bounded before the model call; oversized or unreadable figures are skipped with a warning.

The streamed response emits progress, complete, or error events. The final envelope is evalgpt-prd-judge/v1.

## Deployment

See cloud/DEPLOY_APP_ENGINE.md for private Cloud Run plus App Engine deployment and cloud/RELEASE_GATES.md for model, evidence, Fable, accessibility, canary, monitoring, and rollback gates.

The local Fable review record is in docs/FABLE_UX_REVIEW.md. It does not replace the required fresh-context Fable review against the version-specific deployed preview.

Do not put model keys or internal tokens in tracked YAML. Use Secret Manager. Verify the active GCP project, service accounts, domain mapping, and rollback version before changing production traffic.
