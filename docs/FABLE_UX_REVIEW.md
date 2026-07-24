# Fable UX review record

Date: 2026-07-23
Model: `claude-fable-5`, xhigh effort
Status: the reviewed frontend build passed local and deployed-preview review. The exact final backend-preview rerun is pending because Fable access hit its session limit; public-beta launch remains blocked.

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
  `prd-score-2775dbb-20260723-dot-dompe-dev-439304.uc.r.appspot.com`
- API:
  `prd-score-2775dbb-20260723-dot-api-dot-dompe-dev-439304.uc.r.appspot.com`
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
math, hierarchy, exports, and edge states. The required fresh-context Fable
rerun was attempted but could not start because Fable's Claude session quota was
exhausted until 2:50 a.m. America/Los_Angeles. Consistent with the release rule,
that browser evidence is not treated as a substitute: exact-final-preview Fable
approval and public launch remain blocked until the rerun completes.

## Scope

The Fable record now covers the PRD Judge public-beta interface and the complete
PRD Score integration through frontend commit `2775dbb`, including the
reviewed frontend preview and browser exports. Backend integration commit
`f92cbfc` has refreshed browser evidence but still requires the pending Fable
rerun described above. This record does not certify the fixture model or
waive the independent PRD Score release gate, frozen model suite, privacy
verification, or target-user comprehension gate.
