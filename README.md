# EvalGPT PRD Judge

EvalGPT is a public-beta product for deciding whether a PRD is ready to build. The public information preview explains the method and includes a synthetic example. Live, anonymous evaluation remains fail-closed until the exact judge, model, evidence, and privacy certification gates pass.

The frontend flag `VITE_PUBLIC_EVALUATIONS_ENABLED` defaults to `false`. In that state the browser contains no upload or paste controls and cannot submit a document. Enabling live evaluation is blocked by the full release gates in `cloud/RELEASE_GATES.md`.

## Product contract

- Primary judgment: GO, REVISE, HOLD, WRONG_ARTIFACT, or DISQUALIFY_UNTIL_ARCHITECTURE_AUDIT.
- Readiness score: a deterministic `/10` projection from the validated Judge report. The model never emits, sees, or averages the number.
- Draft strength: PRD Score independently evaluates the same supplied evidence against its absolute-mode rubric and applies deterministic arithmetic to model-owned criterion ratings. It never changes the verdict or readiness score.
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
    Python PRD evaluation runtime (private Cloud Run)
            |
            | exact pinned Judge and PRD Score bundles + approved models
            v
    Judge verdict + readiness /10
    independent PRD Score draft strength /100 or /115
    independent C1-C12 coverage diagnostic

### Components

- frontend/ — 8090-branded responsive product experience, upload/paste flow, progressive result disclosure, and browser-side HTML/PDF/JSON exports.
- api-gateway/ — content-free logging, upload limits, CORS, rate limits, daily kill switch, cancellation, health checks, and SSE proxying.
- judge-runtime/ — in-memory PDF/DOCX/Markdown/text extraction, figure/page support, isolated Judge/rubric/PRD Score model calls, canonical validators, and deterministic calculations.
- judge-runtime/bundle/ — integrity-checked snapshots exported from `salesfactory-agents/prd_judge` and `salesfactory-agents/prd_score`, each with a source commit and file hashes.
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
    VITE_PUBLIC_EVALUATIONS_ENABLED=true npm run dev

Open http://localhost:3000. Fixture mode enables both instruments and exercises the complete upload, streaming, validation, readiness score, PRD Score, rubric, and export path without calling a model.

Run `npm run dev` without the flag to inspect the fail-closed public information preview.

## Model-backed runtime

Model-backed Judge mode fails closed until the release-bakeoff winner is explicitly configured. PRD Score remains disabled by default so an unvalidated score model cannot block or silently enter a production Judge release:

    export ANTHROPIC_API_KEY=...
    export PRD_JUDGE_MODEL=<validated-model-id>
    export PRD_JUDGE_ALLOWED_MODELS=<same-validated-model-id>
    export PRD_JUDGE_EXPECTED_SOURCE_COMMIT=<reviewed-canonical-commit>
    export PRD_JUDGE_EXPECTED_MANIFEST_SHA256=<reviewed-runtime-manifest>
    export PRD_SCORE_ENABLED=false
    judge-runtime/.venv/bin/uvicorn app.main:app --port 8092

After the family-separated PRD Score release gate passes for an exact model/runtime pair, enable it explicitly:

    export PRD_SCORE_ENABLED=true
    export PRD_SCORE_MODEL=<validated-score-model-id>
    export PRD_SCORE_ALLOWED_MODELS=<same-validated-score-model-id>
    export PRD_SCORE_EXPECTED_SOURCE_COMMIT=<reviewed-canonical-score-commit>
    export PRD_SCORE_EXPECTED_MANIFEST_SHA256=<reviewed-score-runtime-manifest>

If an enabled model is absent from its allowlist or its bundle pins do not match, `/health` is degraded and evaluations do not run. If PRD Score is disabled or a score-only report fails validation at run time, the authoritative Judge result still completes and the UI labels draft strength unavailable. No model fallback is used. Every report returns both instrument versions and pins.

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
    npm run test:browser:public
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

- exactly one prd file or prd_text field;
- up to five supporting_files;
- PDF, DOCX, Markdown, and TXT only;
- 25 MB combined;
- 200 known pages across the supplied documents;
- 250,000 pasted characters and 250,000 extracted characters per document;
- at most 12 rendered pages or embedded figures per document, size-bounded before the model call; oversized or unreadable figures are skipped with a warning.

The streamed response emits progress, complete, or error events. The final envelope is `evalgpt-prd-judge/v2`; the frontend fails closed and asks the user to reload if a complete event carries any other envelope version. The top-level `report`, `readiness_score`, `rubric`, and `prd_score` fields remain separate; consumers must not average, blend, or use PRD Score to rewrite the Judge verdict.

## Deployment

See `cloud/DEPLOY_APP_ENGINE.md` for the fail-closed public-frontend path and the separate private Cloud Run plus App Engine live-evaluation path. See `cloud/RELEASE_GATES.md` for model, evidence, Fable, accessibility, canary, monitoring, and rollback gates.

Both App Engine services use the supported Node.js 24 runtime. The frontend's
production security headers live in `frontend/serve.json`, because App Engine
does not allow `http_headers` on the dynamic Node.js script handler.

The Fable review record, including the fresh-context passes against the version-specific deployed preview, is in docs/FABLE_UX_REVIEW.md. That UX pass does not clear the non-UX certification gates in cloud/RELEASE_GATES.md.

Do not put model keys or internal tokens in tracked YAML. Use Secret Manager. Verify the active GCP project, service accounts, domain mapping, and rollback version before changing production traffic.
