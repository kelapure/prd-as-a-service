# EvalGPT PRD Judge

EvalGPT is the 8090-internal browser experience for PRD Judge. It gives a
verified `@8090.inc` Workspace user a stage-aware readiness verdict, a deterministic score,
evidence-backed findings, a prioritized path to GO, and a separate PRD Score
draft-strength diagnostic.

## Product contract

- PRD Judge is primary. The 12-criterion PRD Eval Rubric v2 is a secondary
  diagnostic and cannot override the judge verdict.
- PRD Score is an independent authoring diagnostic. Do not average, blend,
  rescale, or otherwise use it to alter the verdict or readiness score.
- Google Workspace authentication is mandatory in every deployed environment.
  Only a verified token with `hd=8090.inc` is allowed.
- ID tokens stay in browser memory. Firestore may contain only HMAC-pseudonymous
  quota counters and short-lived leases with the approved TTL.
- Do not add payment, profiles, saved history, persistent sharing, or a public
  developer API.
- Do not write source documents, extracted text, findings, or evidence to
  application storage, logs, analytics, local storage, or error reporting.
- Do not silently fall back to an unvalidated model. Fail closed with a
  retryable error.
- Keep the browser-facing interface at `POST /api/prd-judge/evaluate` and the
  runtime service IAM-protected.

## Architecture

```text
frontend/       React/Vite Workspace gate and in-browser HTML/PDF/JSON export
api-gateway/    Fastify token validation, durable quotas, kill switch, SSE proxy
judge-runtime/  FastAPI extraction, judge/score calls, validation, deterministic score
tests/          Cross-service smoke and canonical-bundle conformance tests
cloud/          GCP deployment and release-gate runbooks
```

The trusted prompts, references, deterministic logic, validators, and
calculations are copied into `judge-runtime/bundle/` by the canonical
`salesfactory-agents/prd_judge` and `salesfactory-agents/prd_score` exporters.
The runtime verifies every file hash and manifest hash before serving traffic.
Production also requires exact source-commit and manifest pins for both
instruments. PRD Score is mandatory for EvalGPT; keep the whole deployment
closed until its separate release gate passes.

## Local checks

```bash
# Runtime
cd judge-runtime
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m pytest

# Gateway
cd ../api-gateway
npm ci
npm run type-check
npm test
npm audit --audit-level=high

# Frontend
cd ../frontend
npm ci
npm run type-check
npm run build
npm run test:browser
npm audit --audit-level=high

# Cross-repository bundle check and end-to-end smoke
cd ..
judge-runtime/.venv/bin/python tests/check_bundle_conformance.py \
  --canonical-root /path/to/clean/salesfactory-agents/prd_judge
judge-runtime/.venv/bin/python tests/check_score_bundle_conformance.py \
  --canonical-root /path/to/clean/salesfactory-agents/prd_score
node tests/smoke.mjs
```

See `README.md` for local service startup, `cloud/DEPLOY_APP_ENGINE.md` for the
deployment sequence, `cloud/RELEASE_GATES.md` for launch criteria, and
`docs/FABLE_UX_REVIEW.md` for UX-review evidence.

## Release rule

A local build is not a launch. Production remains blocked until the exact
deployed judge/model pair passes the frozen family-separated certification
suite, privacy/provider retention is verified, the preview passes fresh-context
Fable review, accessibility and target-user tests pass, and GCP routing,
secrets, rollback, and canary controls are verified.
