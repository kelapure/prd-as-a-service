# PRD Judge public-beta release gates

Every checkbox is blocking unless marked post-beta. Evidence belongs in the release issue or PR.

## Judgment and evidence

- [ ] The runtime bundle source commit and manifest match the reviewed canonical PRD Judge commit.
- [ ] The production model won the adjudicated bakeoff: zero false GO, then gate/verdict accuracy, evidence precision, latency, and cost.
- [ ] No unvalidated fallback model is configured.
- [ ] Canonical report validator passes 100 percent of release-suite outputs.
- [ ] Fabricated or unsupported used quotes: zero.
- [ ] Finding precision is at least 70 percent on the adjudicated release set.
- [ ] Defect recall is at least 40 percent on the adjudicated release set.
- [ ] Historical source-status, negation, intent, verdict-consistency, and fabricated-evidence regressions pass.
- [ ] The public example uses synthetic or explicitly licensed material.

## PRD Score draft-strength diagnostic

- [ ] `PRD_SCORE_ENABLED` remains false until every item in this section passes.
- [ ] The runtime bundle source commit and manifest match the reviewed canonical `prd_score` commit.
- [ ] The production PRD Score model is allowlisted and pinned with no automatic fallback.
- [ ] The family-separated score suite includes at least 20 artifacts and 20 distinct artifact families.
- [ ] PRD Score schema and deterministic arithmetic pass 100 percent of release outputs.
- [ ] Unsupported PRD Score evidence quotations: zero.
- [ ] Repeat-score groups include at least five families and maximum per-criterion drift is no more than one anchor point.
- [ ] At least 80 percent of five or more controlled revision pairs improve monotonically.
- [ ] At least 80 percent of five or more human reviews rate the prioritized fixes useful.
- [ ] The UI and exports disclose the mode, denominator, writing-layer status, sample size, and historical 70 threshold.
- [ ] PRD Score remains visibly secondary and does not alter, average with, or override Judge readiness.

## Product, privacy, and security

- [ ] Auth, Stripe, Firestore, saved history, and persistent sharing routes are unreachable.
- [ ] Source files, extracted text, findings, and evidence do not enter application storage, logs, analytics, browser local storage, or error reporting.
- [ ] The production model provider and account retention terms are verified before stronger privacy claims are published.
- [ ] Cloud Run denies unauthenticated invocation and grants roles/run.invoker only to the gateway service account.
- [ ] MIME/signature validation, 25 MB combined limit, 200-page limit, five-supporting-file limit, timeouts, cancellation, per-IP rate limits, and daily kill switch pass.
- [ ] npm audit reports zero known vulnerabilities for frontend and gateway images.
- [ ] Secret scanning and container scanning pass.

## UX and accessibility

- [ ] Fable prototype review findings are incorporated.
- [ ] Fresh-context Fable review runs against real preview pixels and interactions.
- [ ] No unresolved Fable P0/P1 finding remains; fixes are re-reviewed.
- [ ] A first-time user can identify verdict, score meaning, and first required fix without opening secondary detail.
- [ ] At least four of five target users identify the verdict and first required fix within 30 seconds without coaching.
- [ ] Homepage, file/paste input, supporting evidence, progress, Revise, Go, Wrong artifact, long findings, no findings, validation failure, unsupported file, and narrow mobile states are verified.
- [ ] Keyboard flow, visible focus, semantic headings, disclosures, live progress, error announcements, and export controls pass.
- [ ] WCAG 2.2 AA contrast and 200 percent zoom/reflow pass.
- [ ] There is one dominant emphasis per screen and no gradients, emoji, decorative dashboards, generic red-card walls, or unbounded corner radii.

## Reliability and rollout

- [ ] /api/health reports the exact deployed Judge model, the Judge and PRD Score bundle versions, source commits, and manifests, the rubric and Judge calculation versions, and whether PRD Score is enabled; every report envelope pins the PRD Score model and calculation version.
- [ ] Valid-run completion is at least 98 percent.
- [ ] 5xx responses remain below 2 percent.
- [ ] p95 completion remains below 120 seconds for a representative 30-page PRD.
- [ ] Current App Engine versions and traffic splits are recorded as rollback targets.
- [ ] 10 percent canary observation passes before 50 percent; 50 percent passes before 100 percent.
- [ ] Roll back immediately on false GO evidence, leaked content, malformed reports, score/report mismatch, or loss of approved-model capacity.

## Certification language

The site and every export remain labeled Public beta. Validated, certified, or generally available language is blocked until a frozen, family-separated test report is produced from the exact deployed judge/model version.
