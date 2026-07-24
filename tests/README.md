# EvalGPT integration tests

The synthetic fixture contains no client data. Run the full local path after building the gateway:

    cd api-gateway && npm run build
    cd ..
    node tests/smoke.mjs

The smoke test starts the private runtime in fixture mode, starts the gateway
with Workspace enforcement disabled only for the local fixture, submits a
multipart PRD, consumes the streamed result, checks the
versioned/ephemeral/verified contract including the separate PRD Score
diagnostic, and proves retired payment and document-storage routes are absent.

Gateway unit and integration tests separately prove Google claim validation,
authentication before multipart parsing, structured access failures, durable
quota boundaries, UTC resets, concurrency, lease expiry, cancellation
accounting, HMAC user identifiers, and fail-closed store behavior.

The frontend `workspace-auth.mjs` test stubs the official GIS interface and
gateway responses to cover sign-in, sign-out, external denial, quota display,
exhaustion, capacity busy, token-expiry recovery, document preservation,
browser-storage absence, accessibility, and overflow.

Verify the copied judge and PRD Score bundles against the exact clean canonical worktrees:

    judge-runtime/.venv/bin/python tests/check_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_judge
    judge-runtime/.venv/bin/python tests/check_score_bundle_conformance.py \
      --canonical-root /path/to/clean/salesfactory-agents/prd_score
