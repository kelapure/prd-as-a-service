# Public-beta tests

The synthetic fixture contains no client data. Run the full local path after building the gateway:

    cd api-gateway && npm run build
    cd ..
    node tests/smoke.mjs

The smoke test starts the private runtime in fixture mode, starts the gateway, submits a multipart PRD, consumes the streamed result, checks the versioned/ephemeral/verified contract, and proves the retired auth, payment, and storage routes are absent.

Verify the copied judge bundle against the exact clean canonical worktree:

    judge-runtime/.venv/bin/python tests/check_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_judge
