# EvalGPT PRD Judge runtime

The runtime is an internal, stateless service for the EvalGPT public beta. It loads
integrity-checked snapshots exported from the canonical `prd_judge` and `prd_score`
agents, extracts PDF/DOCX/Markdown/text in memory, and runs PRD Judge, PRD Score, and
the secondary PRD Eval Rubric v2 concurrently in isolated model contexts. It validates
quotes against the supplied sources and applies each instrument's deterministic
calculation only after the corresponding report is valid. PRD Score never changes or
mathematically combines with the Judge verdict or readiness score.

Scanned-page renders and embedded figures are capped at 12 per document and are resized
or re-encoded to bounded dimensions and bytes before they reach the model. An oversized
or unreadable figure is skipped and reported as an extraction warning.

## Local development

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
JUDGE_RUNTIME_MODE=fixture .venv/bin/uvicorn app.main:app --port 8092
```

Model-backed mode fails closed until the exact release-bakeoff winner is configured:

```bash
export ANTHROPIC_API_KEY=...
export PRD_JUDGE_MODEL=<validated-model-id>
export PRD_JUDGE_ALLOWED_MODELS=<same-validated-model-id>
export PRD_JUDGE_EXPECTED_SOURCE_COMMIT=<reviewed-canonical-commit>
export PRD_JUDGE_EXPECTED_MANIFEST_SHA256=<reviewed-runtime-manifest>
export PRD_SCORE_ENABLED=false
uvicorn app.main:app --port 8092
```

PRD Score is feature-gated separately because its checked-in release candidate is
blocked until the family-separated validation metrics pass. After that gate passes,
configure the exact approved pair:

```bash
export PRD_SCORE_ENABLED=true
export PRD_SCORE_MODEL=<validated-score-model-id>
export PRD_SCORE_ALLOWED_MODELS=<same-validated-score-model-id>
export PRD_SCORE_EXPECTED_SOURCE_COMMIT=<reviewed-canonical-score-commit>
export PRD_SCORE_EXPECTED_MANIFEST_SHA256=<reviewed-score-runtime-manifest>
```

There is no automatic fallback model. A missing or mismatched commit or manifest pin
for any enabled instrument makes `/health` degrade and blocks evaluation. A
run-specific PRD Score validation failure is fail-soft: the authoritative Judge report
still returns and `prd_score.status` is `unavailable`. Cloud Run should require IAM,
and the optional `INTERNAL_SERVICE_TOKEN` provides an additional gateway-to-runtime
check. `/health` exposes the exact score bundle, model, calculation version, and
enabled state without including document content.

## Refreshing the canonical bundles

Run from this repository after the canonical judge or score change is committed:

```bash
python3 ../salesfactory-agents/prd_judge/scripts/export_runtime_bundle.py \
  --output judge-runtime/bundle/prd-judge-runtime.json

python3 ../salesfactory-agents/prd_score/scripts/export_runtime_bundle.py \
  --output judge-runtime/bundle/prd-score-runtime.json
```

Commit both bundles with their consuming runtime change so every deployed result can
be reproduced from the returned source commits and manifest hashes. Run both
`tests/check_bundle_conformance.py` and `tests/check_score_bundle_conformance.py`
against clean canonical worktrees before release.
