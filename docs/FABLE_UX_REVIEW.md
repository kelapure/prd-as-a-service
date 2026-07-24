# Fable UX review record

Initial review: 2026-07-23
Final exact-preview rerun: 2026-07-24
Model: `claude-fable-5`, xhigh effort
Status: local, deployed-preview, and exact-final-preview reviews passed with no
blocking Fable findings. Public-beta launch remains blocked by the independent
model, validation, privacy, and target-user gates.

## Pass 1: prototype and information architecture

Fable identified three blocking risks before implementation:

1. A fail-heavy result would feel punitive unless the Path to GO sat adjacent to the verdict.
2. A long streaming wait would erode trust without named, meaningful phases.
3. Dense evidence and diagnostics could bury the actual decision.

Implementation response:

- The verdict is the single dominant panel and includes the first required move.
- The complete Path to GO follows before findings or rubric detail.
- Progress has five explicit phases: Uploading, Extracting evidence, Applying gates, Forming judgment, and Validating report.
- Finding evidence, the evidence ledger, rubric, score method, and versions use progressive disclosure.

## Pass 2: fresh-context local pixel review

Fable reviewed desktop and narrow-mobile captures from the production frontend build. The first adversarial read returned three P1 findings:

1. A full-page mobile capture made the skip link and sticky header look duplicated and overlapping.
2. The rubric and evidence-ledger rows did not communicate that they were expandable.
3. A cropped result-element capture clipped the 8090 mark at its left edge.

Resolution and rerun:

- Re-captured real viewports instead of judging sticky elements from stitched full-page crops. Fable returned `PASS` for the mobile homepage header, skip-link state, privacy content, and the complete 8090 mark.
- Added explicit `Open diagnostic` and `Open ledger` controls with matching close states. Fable returned `YES` when asked whether both controls were now explicit.
- Moved export controls below the verdict and added the first Path-to-GO action inside the verdict panel. The result is focused and scrolled into view on completion. Fable returned `PASS` for the desktop hierarchy and `PASS` for identifying both the verdict and first action on mobile within 30 seconds.
- Fable separately returned no launch-blocking issue for evidence traceability, export discoverability, long-page navigation, or generic visual slop.
- After removing remote font loading and unused gradient/scrim utilities, a final fresh-context pass inspected the regenerated desktop and mobile homepage/result pixels. It returned `PASS` with no fallback-typography hierarchy, wrapping, clipping, or comprehension regression.

Automated browser checks also report no serious or critical axe violations at desktop, tablet, or 375-pixel mobile widths. They verify result focus, zero horizontal overflow, and the representative result hierarchy.

## Deployed-preview review

Fable reviewed the version-specific, zero-traffic App Engine preview in a new
session:

- First-pass preview: deployed from frontend commit `7af185e`, the branch
  state before the UX fixes; its App Engine version identifier was not
  recorded at review time
- Second-pass preview: `prd-judge-beta-d5af393-20260723`, deployed from
  frontend commit `d5af393`
- Viewports: 1440-pixel desktop, 834-pixel tablet, and 375-pixel mobile
- States: homepage, example result, live evaluation result, loading, retryable
  error, no findings, and an extremely long finding

The first deployed-preview pass, against the `7af185e` preview, returned
`PASS` with no blocking finding. It also identified small issues with anchor
offsets, mobile example access, cancel-state framing, input-mode semantics,
no-findings language, confidence contrast, and finding-count labels. Those
issues were resolved in `d5af393` and covered by browser regression checks.

A second fresh-context review inspected the rebuilt and redeployed
`prd-judge-beta-d5af393-20260723` preview. It
again returned `PASS`: the verdict, score, confidence, and first action were
visible above the fold at all three widths; Path to GO remained ahead of
findings and diagnostics; evidence stayed traceable; long findings wrapped
without overflow; and loading, retryable error, export, and no-findings
patterns remained comprehensible.

The deployed browser run reported no page errors, no horizontal overflow, and
no serious or critical axe findings at any tested width. A live paste flow
focused the result and rendered the versioned fixture report through the
private runtime path.

This UX pass does not certify the fixture model as a production model and does
not satisfy the frozen-suite, precision, recall, retention, or target-user
comprehension release gates.

## PRD Score integration review

Fable separately reviewed the PRD Score integration in fresh contexts. This
review covered the updated homepage and upload flow, the result hierarchy, the
new `Scoring draft strength` phase, browser exports, and the following realistic
result states:

- complete Judge and PRD Score results;
- no Judge findings;
- PRD Score unavailable while the Judge result remains valid;
- PRD Score not scored because its own artifact gate failed;
- an extremely long finding;
- loading, cancellation, and retryable error states.

The prototype review found and blocked:

1. colliding score and rubric criterion IDs without visible names;
2. the evidence ledger appearing after the C1-C12 diagnostic;
3. adjusted scores without visible normalization math and repetitive example
   evidence;
4. raw gate IDs in the HTML export;
5. the instrument-independence note hidden behind a collapsed disclosure; and
6. evaluator commentary represented as supplied quotations.

Those issues were resolved with `Score C7 · Out of scope and roadmap`-style
labels, an always-visible namespace note, the required evidence-ledger order,
raw-to-adjusted arrows and method facts, humanized export labels, and
dimension-specific source quotations. The final prototype review returned
`PASS` and the exact statement `No blocking Fable findings.`

The final deployed review used the zero-traffic preview:

- Frontend:
  `prd-score-2b8a847-20260724-dot-dompe-dev-439304.uc.r.appspot.com`
- API:
  `prd-score-2b8a847-20260724-dot-api-dot-dompe-dev-439304.uc.r.appspot.com`
- Runtime revision: `prd-judge-runtime-preview-00006-fcr`
- Viewports: 1440-pixel desktop, 834-pixel tablet, and 375-to-390-pixel mobile
- Canonical PRD Score source:
  `20225956d8659f77fb15e0ee7be53b105f9f2944`
- Canonical PRD Score manifest:
  `8c5977936e58c422e555e0f9e0b1554734902f39bd5aead0dc8bc967453ad236`

Fable verified:

- the Judge remains the dominant N/10 readiness decision;
- PRD Score is a separate N/100 draft-strength diagnostic and never changes
  readiness;
- the C1-C12 rubric is a third, subordinate coverage diagnostic;
- Layer 1 `36` plus adjusted Layer 2 `29` equals `65/100`;
- writing `12/20` is separately labeled and excluded from `65/100`;
- the UI and HTML export separate writing rows and render missing evidence
  without quotation marks;
- one-source grammar, example-export labeling, no-findings copy, and
  whole-sentence fixture quotations are correct; and
- the responsive, long-finding, loading, error, no-findings, unavailable, and
  not-scored states remain credible.

A final exact-frontend review followed the no-mistakes fixes in frontend
commit `2775dbb`. It confirmed that the loading stepper now derives its columns
from visible phases, the shared score-row component preserves the reviewed
hierarchy at every viewport, and the independent PRD Score timeout cannot
consume the Judge deadline. The deployed pass returned `PASS` and the exact
statement `No blocking Fable findings.` It left two product-polish opportunities
that do not block stakeholder review: render `summary` evidence as an explicitly
unquoted paraphrase, and include human-readable PRD Score dimension names in the
JSON envelope. Sticky-header and skip-link artifacts were limited to stitched
capture mechanics rather than the live interface.

The later backend-only correctness commit `f92cbfc` changed authored-line
counting for short-document normalization, deduplicated fail-soft score
construction, and asserted criterion IDs against the bundled validator. It did
not change frontend code. Runtime revision
`prd-judge-runtime-preview-00006-fcr` was deployed to the same zero-traffic
preview, and the complete browser capture passed again with unchanged fixture
math, hierarchy, exports, and edge states.

On 2026-07-24, a fresh-context Fable rerun reviewed that exact deployment,
including the live preview, health provenance, desktop/tablet/mobile captures,
HTML and JSON exports, and the no-findings, unavailable, not-scored,
long-finding, loading, and error states. It returned `PASS` and the exact
statement `No blocking Fable findings.` Fable confirmed that the Judge remains
dominant, all three instruments remain distinguishable, the deterministic score
math and evidence treatments are consistent, and the preview is ready for
stakeholder review.

Fable left three nonblocking observations: mirror the UI's no-actions message in
the HTML export instead of rendering an empty ordered list, watch the shared
`C`-prefix namespace in target-user testing, and avoid treating sticky-header
artifacts in stitched screenshots as live layout defects. None is a P0 or P1
finding.

A later review-driven frontend commit `a0bc696` landed after that rerun. It
makes the page fail closed with reload guidance when a complete event carries
any envelope other than `evalgpt-prd-judge/v2` with a `prd_score` block, and it
keeps an in-scope Layer 3 zero visible in the deterministic-total breakdown on
the page and in the HTML export. The browser regression check
`frontend/tests/score-envelope-guard.mjs` pins both behaviors against the built
frontend and captures its screenshot and export evidence; run it with
`node tests/score-envelope-guard.mjs` from `frontend/` after a build.

Those post-review changes were deployed as the zero-traffic App Engine preview
`prd-score-2b8a847-20260724`. A second fresh-context Fable rerun inspected that
exact app head, the live fixture evaluation, the v2-envelope error state, the
Layer 3 zero UI and HTML export, all responsive and edge-state captures, and the
health provenance. It returned `PASS` and the exact statement
`No blocking Fable findings.` No P0 or P1 finding remains.

The second rerun left three nonblocking observations: the controlled Layer 3
capture uses an empty score list even though the runtime requires P1-P3 rows
when Layer 3 is in scope, some full-height capture artifacts show fixed-position
header fragments, and the explicitly marked example export uses placeholder
version values. These are test-fixture or capture-polish observations rather
than live-product blockers.

## Scope

The Fable record now covers the PRD Judge public-beta interface and the complete
PRD Score integration through validated app head `2b8a847`, including frontend
hardening commit `a0bc696`, the reviewed preview and browser exports, and
backend integration commit `f92cbfc` on runtime revision
`prd-judge-runtime-preview-00006-fcr`. This record does not certify the fixture
model or waive the independent PRD Score release gate, frozen model suite,
privacy verification, or target-user comprehension gate.

The fail-closed public information preview, gated by
`VITE_PUBLIC_EVALUATIONS_ENABLED`, landed after this record. Automated
public-preview browser checks (`npm run test:browser:public`) verify the
closed state, accessibility, and layout at desktop, tablet, and narrow-mobile
widths, but the exact deployed preview still requires its own fresh-context
Fable pass before promotion, per the preview gates in
`cloud/RELEASE_GATES.md`.

## Live progress transport review

On 2026-07-24, Fable reviewed the exact zero-traffic desktop preview
`stream-273d455-20260724` after the evaluation gateway moved from
non-streaming App Engine Standard to Cloud Run. The review inspected the
deployed preview, the live phase-05 browser capture, the SSE client and
gateway source, cancellation, CSP, and the separation between Judge readiness
and PRD Score draft strength. It returned `PASS` and the exact statement
`No blocking Fable findings.`

The reviewed live browser run received real, model-backed phase events without
client-side simulation and reached `Scoring draft strength` in 351 ms with no
console or CSP errors. Fable recorded four nonblocking P2 opportunities: show a
fixed step count from the beginning when score availability is known, consider
a truthful elapsed-time cue during long phases, move keyboard focus into the
progress region on submit, and measure the upcoming-step contrast before GA.

## Beta-positioning removal review

On 2026-07-24, Fable reviewed the exact zero-traffic desktop preview
`no-beta-f215043-20260724` after the visible `Public beta` positioning and the
four-cell commitment strip were removed. The review inspected the homepage,
example result, HTML export, deployed bundles, and the oversized-upload error.
It returned `PASS` and the exact statement `No blocking Fable findings.`

Fable verified that no human-facing beta copy or trust-strip markup remains,
that the hero-to-value-section transition has no orphaned gap or border, and
that Judge primacy, PRD Score separation, privacy content, and export hierarchy
remain intact. Machine-readable schema fields, run IDs, and pinned instrument
version identifiers remain unchanged as provenance rather than positioning
copy.
