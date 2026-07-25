# Repository Guidelines

## Project structure

- `frontend/` — React + Vite public-beta UI; builds to `build/`.
- `api-gateway/` — Fastify same-origin API and SSE proxy; public endpoint is
  `POST /api/prd-judge/evaluate`.
- `judge-runtime/` — IAM-protected FastAPI runtime for extraction, judgment,
  validation, deterministic scoring, the separate PRD Score draft-strength
  diagnostic, and the secondary rubric diagnostic.
- `tests/` — end-to-end smoke and canonical runtime-bundle conformance tests.
- `cloud/` — deployment and release-gate runbooks.

## Product and privacy constraints

- PRD Judge is the authoritative readiness decision. PRD Eval Rubric v2 is a
  secondary diagnostic and never overrides the verdict.
- PRD Score is a separate draft-strength diagnostic. Never mathematically
  combine it with readiness or use it to change the verdict.
- The beta is Google-authenticated and ephemeral. Authentication must not add
  profiles, payment, saved history, persistent sharing, or a public developer API.
- Do not put document content, extracted text, findings, or evidence in logs,
  analytics, storage, browser local storage, or error reporting.
- Do not automatically fall back to an unvalidated model.
- The public frontend fails closed: leave `VITE_PUBLIC_EVALUATIONS_ENABLED`
  unset or exactly `false` so public builds contain no document input until the
  release gates in `cloud/RELEASE_GATES.md` pass.
- Keep the runtime private and use the same-origin gateway as the only browser
  interface.

## Build and test commands

```bash
# Runtime
cd judge-runtime && .venv/bin/python -m pytest

# Gateway
cd api-gateway && npm ci && npm run type-check && npm test

# Frontend
cd frontend && npm ci && npm run type-check && npm run test:browser

# Cross-service, from repo root
judge-runtime/.venv/bin/python tests/check_bundle_conformance.py \
  --canonical-root /path/to/clean/salesfactory-agents/prd_judge
judge-runtime/.venv/bin/python tests/check_score_bundle_conformance.py \
  --canonical-root /path/to/clean/salesfactory-agents/prd_score
node tests/smoke.mjs
```

The complete release criteria are in `cloud/RELEASE_GATES.md`. A green local
suite is necessary but not sufficient for launch.

## Coding and review

- TypeScript uses strict mode, ES modules, two-space indentation, `camelCase`
  values, and `PascalCase` components/types.
- Keep API and file-format validation explicit at service boundaries.
- Any API, environment, privacy, or deployment change must update the relevant
  README, example environment file, and tests in the same change.
- UI changes must follow the 8090 semantic-token system, validate desktop,
  tablet, and narrow mobile layouts, and complete the required Fable reviews.
- Never commit credentials, raw PRD content produced during testing, or
  deployed-preview data.
- Use Conventional Commit prefixes.
