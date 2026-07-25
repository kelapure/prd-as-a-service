# EvalGPT release gates

Every applicable checkbox is blocking for production traffic. Evidence belongs in the release issue or pull request.

## Google authentication and access tiers

- [ ] Google Auth Platform audience is External and the production app is published.
- [ ] Authorized JavaScript origins contain only production, the exact preview, and approved local origins.
- [ ] Anonymous requests receive `401 auth_required` before multipart parsing.
- [ ] Expired tokens receive `401 token_expired`.
- [ ] Verified Gmail and external Workspace accounts are admitted to the limited tier.
- [ ] Exact `hd=8090.inc` identities are classified as internal; email suffixes are not used as the membership authority.
- [ ] Unverified email, wrong audience, wrong issuer, missing subject, malformed, and forged tokens are denied.
- [ ] The configured audience, issuer, expiration, verified email, and stable `sub` are validated for every tier.
- [ ] The ID token exists only in browser memory and never enters local storage, session storage, cookies, analytics, error reporting, or logs.
- [ ] `GET /api/access` returns only the signed-in email, server-owned tier, and allowance status.
- [ ] Sign-out clears in-memory identity and disables Google automatic account selection.
- [ ] Token-expiry recovery preserves locally selected files and pasted content.
- [ ] `/api/health` remains unauthenticated and content-free.

## Durable quotas

- [ ] Firestore Native `(default)` is in `us-central1`.
- [ ] The gateway service account has `roles/datastore.user` and no unnecessary Firestore role.
- [ ] User document IDs are HMAC-SHA256 digests of Google `sub`; raw `sub`, email, token, filename, PRD content, findings, and evidence are absent from Firestore.
- [ ] The HMAC key is supplied from Secret Manager and contains at least 32 random bytes.
- [ ] Transactions enforce three lifetime starts for each external identity, fifty external starts per UTC day, and two active global leases across revisions.
- [ ] Internal identities bypass user and external-global count exhaustion while still acquiring a concurrency lease.
- [ ] Capacity rejections do not consume a start; every admitted start counts once even on cancellation or downstream failure.
- [ ] Concurrency is released in `finally`, and abandoned leases expire after 12 minutes.
- [ ] External user documents contain only `totalCount`; they intentionally omit timestamps and `expiresAt` so the one-time allowance does not reset and no activity history is retained.
- [ ] `expiresAt` TTL is enabled for global capacity metadata; lease/capacity retention is 90 days.
- [ ] Firestore outage fails closed with `503 quota_store_unavailable`; no per-instance fallback is active when authentication is required.
- [ ] Terminal external exhaustion uses `evaluation_limit_reached` without `Retry-After`; retryable capacity failures include valid `Retry-After`.
- [ ] Route-specific IP burst limits exclude health checks and do not trust unconfigured forwarding headers.

## Judgment and evidence

- [ ] The runtime bundle source commit and manifest match the reviewed canonical PRD Judge commit.
- [ ] The production Judge model won the adjudicated bakeoff: zero false GO, then gate/verdict accuracy, evidence precision, latency, and cost.
- [ ] No unvalidated Judge fallback model is configured.
- [ ] Canonical report validator passes 100 percent of release-suite outputs.
- [ ] Fabricated or unsupported used quotes: zero.
- [ ] Finding precision is at least 70 percent on the adjudicated release set.
- [ ] Defect recall is at least 40 percent on the adjudicated release set.
- [ ] Historical source-status, negation, intent, verdict-consistency, and fabricated-evidence regressions pass.
- [ ] The example result uses synthetic or explicitly licensed material.

## Mandatory PRD Score

- [ ] Runtime health reports `prd_score_enabled: true`.
- [ ] The PRD Score bundle source commit and manifest match the reviewed canonical `prd_score` commit.
- [ ] The PRD Score model is independently allowlisted and pinned with no automatic fallback.
- [ ] The family-separated score suite includes at least 20 artifacts and 20 distinct artifact families.
- [ ] PRD Score schema and deterministic arithmetic pass 100 percent of release outputs.
- [ ] Unsupported PRD Score evidence quotations: zero.
- [ ] Repeat-score groups include at least five families and maximum per-criterion drift is no more than one anchor point.
- [ ] At least 80 percent of five or more controlled revision pairs improve monotonically.
- [ ] At least 80 percent of five or more human reviews rate the prioritized fixes useful.
- [ ] The UI and exports disclose the mode, denominator, writing-layer status, sample size, and historical threshold.
- [ ] PRD Score remains visibly secondary and never alters, averages with, or overrides Judge readiness.
- [ ] A real preview evaluation proves Judge and PRD Score both execute.

## Product, privacy, and security

- [ ] Stripe, profile, saved-history, document-storage, and persistent-sharing routes are unreachable.
- [ ] Source files, extracted text, findings, evidence, filenames, email addresses, Google subjects, and tokens do not enter application logs, analytics, browser storage, or error reporting.
- [ ] The production model provider and account retention terms are verified before stronger privacy claims are published.
- [ ] Cloud Run denies unauthenticated invocation of the runtime and grants `roles/run.invoker` only to the gateway service account.
- [ ] MIME/signature validation, 25 MB combined limit, 200-page limit, five-supporting-file limit, timeouts, cancellation, and kill switch pass.
- [ ] Frontend and gateway npm audit reports contain zero known production vulnerabilities.
- [ ] Secret scanning and container scanning pass.

## UX and accessibility

- [x] Fable prototype review approved the sign-in and quota-state plan.
- [ ] A fresh-context Fable review runs against real preview pixels and interactions.
- [ ] No unresolved Fable P0/P1 remains; fixes are re-reviewed.
- [ ] If Fable is unavailable, Opus 5 reviews at xhigh effort and every P0/P1 remains blocking.
- [ ] The signed-out screen is a focused doorway, not an account dashboard.
- [ ] Signed-in identity and quota status remain secondary to the evaluation task.
- [ ] Sign-in, sign-out, denial, expiry, exhausted quota, global limit, capacity busy, quota unavailable, loading, error, no-findings, and realistic result states are verified.
- [ ] Keyboard flow, visible focus, semantic headings, disclosures, live progress, error announcements, and export controls pass.
- [ ] WCAG 2.2 AA contrast and 200 percent zoom/reflow pass.
- [ ] There is one dominant emphasis per screen and no gradients, emoji, decorative dashboards, generic red-card walls, or unbounded corner radii.

## Reliability and rollout

- [ ] `/api/health` reports the exact deployed Judge and PRD Score models, bundles, source commits, manifests, rubric version, calculation versions, PRD Score enabled state, authentication mode, and quota-store health.
- [ ] Valid-run completion is at least 98 percent.
- [ ] 5xx responses remain below 2 percent.
- [ ] p95 completion remains below 120 seconds for a representative 30-page PRD.
- [ ] Current App Engine version and gateway revision are recorded as rollback targets.
- [ ] Auth-capable gateway deploys with enforcement off before the frontend canary.
- [ ] Authenticated frontend passes 10 percent, then 50 percent, then 100 percent observation windows.
- [ ] Gateway mandatory authentication is enabled only after the authenticated frontend reaches 100 percent.
- [ ] Real internal, Gmail, external Workspace, anonymous, allowance, multi-revision, Judge, and PRD Score checks pass after cutover.
- [ ] Rollback never restores anonymous access; evaluation failure uses `EVALUATIONS_ENABLED=false`.

## Claims

Do not use “validated,” “certified,” or general-availability language until a frozen, family-separated test report exists for the exact deployed Judge and PRD Score versions.

## 2026-07-24 Workspace cutover evidence

This evidence records the access-control release only. It does not satisfy or
waive the independent model-certification, target-user, or general-availability
gates above.

- Fable approved the sign-in and quota plan, then returned `PASS` on the exact
  zero-traffic `workspace-auth3-20260724` preview with no P0/P1 findings.
- Automated gateway coverage verifies exact-domain claims, invalid and forged
  token rejection, authentication before multipart parsing, quota reset and
  boundary behavior, concurrency, lease expiry, cancellation, store failure,
  mandatory PRD Score health, and structured `Retry-After` responses.
- Browser coverage verifies sign-in, sign-out, identity changes, quota display,
  exhaustion, capacity and store failures, expired-token recovery, preserved
  local input, keyboard operation, and result clearing.
- A real `@8090.inc` account reached the authenticated workspace. Google
  rejected an external Gmail account at the Internal OAuth boundary, and an
  anonymous upload received `401 auth_required` before multipart parsing.
- A real end-to-end run returned both a validated Judge report and a mandatory
  validated PRD Score report. The production runtime and frontend now reject
  partial or legacy `prd_score.status=unavailable` completions.
- Firestore inspection showed a 64-character HMAC user key, content-free
  counters and timestamps, and no email, token, filename, PRD, finding, or
  evidence fields. Both quota collections have active 90-day TTL policies.
- At cutover, the recorded rollback targets were App Engine
  `workspace-auth2-20260724`, gateway
  `evalgpt-api-gateway-00009-zt7`, and runtime
  `prd-judge-runtime-real-demo-00012-dwq`. Rollback must disable evaluations
  rather than restore anonymous access.
- The final hardened release serves App Engine
  `workspace-auth4-20260724`, gateway
  `evalgpt-api-gateway-00010-px5`, and runtime
  `prd-judge-runtime-real-demo-00013-6q2` at 100 percent traffic.
- Health reported authentication `required`, quota store `ok`, mandatory PRD
  Score enabled, and `claude-sonnet-5` for both instruments.
