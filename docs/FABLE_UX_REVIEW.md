# Fable UX review record

Date: 2026-07-21
Model: `claude-fable-5`, xhigh effort
Status: local prototype and local production-build pixels reviewed; deployed-preview review remains a launch gate.

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

## Remaining binding review

The required second pass must be repeated in a fresh context against the deployed, version-specific preview, not substituted with this local review. Launch remains blocked until that preview exists and Fable clears its real loading, error, long-finding, no-finding, and interaction states.
