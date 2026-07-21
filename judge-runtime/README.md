# EvalGPT PRD Judge runtime

The runtime is an internal, stateless service for the EvalGPT public beta. It loads an
integrity-checked snapshot exported from the canonical `prd_judge` agent, extracts
PDF/DOCX/Markdown/text in memory, runs PRD Judge and the secondary PRD Eval Rubric v2
in separate model contexts, validates quotes against the supplied sources, and applies
the canonical deterministic readiness score after the report is valid.

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
uvicorn app.main:app --port 8092
```

There is no automatic fallback model. A missing or mismatched commit or manifest pin
makes `/health` degrade and blocks evaluation. Cloud Run should require IAM, and the
optional `INTERNAL_SERVICE_TOKEN` provides an additional gateway-to-runtime check.

## Refreshing the canonical bundle

Run from this repository after the canonical judge change is committed:

```bash
python3 ../salesfactory-agents/prd_judge/scripts/export_runtime_bundle.py \
  --output judge-runtime/bundle/prd-judge-runtime.json
```

Commit the bundle with its consuming runtime change so every deployed result can be
reproduced from the returned source commit and manifest hash.
