# Public-beta tests

The synthetic fixture contains no client data. Run the full local path after building the gateway:

    cd api-gateway && npm run build
    cd ..
    node tests/smoke.mjs

The smoke test starts the private runtime in fixture mode, starts the gateway, submits a multipart PRD, consumes the streamed result, checks the versioned/ephemeral/verified contract including the separate PRD Score diagnostic, and proves the retired auth, payment, and storage routes are absent.

Verify the copied judge and PRD Score bundles against the exact clean canonical worktrees:

    judge-runtime/.venv/bin/python tests/check_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_judge
    judge-runtime/.venv/bin/python tests/check_score_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_score
