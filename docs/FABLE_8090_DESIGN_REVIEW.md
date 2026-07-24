# Fable plan and Opus 5 review — supplied 8090 design system

## Release status

**Approved for production promotion with no unresolved P0/P1 findings.**

The required Fable planning pass completed before implementation. The required
fresh-context review of the deployed preview was then attempted, but Fable
returned:

> You've reached your Fable 5 limit. Run /usage-credits to continue or switch models with /model.

The product owner then explicitly authorized Opus 5 as the final reviewer.
`claude-opus-5` completed two fresh deployed-preview reviews at xhigh effort.
The first review blocked R2 on two P0 and six P1 findings. Those findings were
fixed, regression assertions were added, and the exact R3 preview was
re-reviewed. The final verdict was:

> APPROVED: no unresolved P0/P1

## Planning pass

Fable reviewed the supplied brand package, the existing UI, and the export
pipeline before any design changes were made. Its implementation plan required:

- the supplied linen, moss, rust, rock, status, and link tokens;
- self-hosted Söhne and Söhne Mono;
- the real 8090 mark instead of a text approximation;
- a restrained painterly hero and footer moment;
- flat surfaces with no shadows, gradients, or glass;
- 6 px cards, 4 px buttons, 2 px inputs, and 12 px large imagery;
- the existing Judge-first result hierarchy with PRD Score kept secondary;
- self-contained HTML exports that preserve the same evidence hierarchy.

## Implemented preview

- Preview: <https://design-8090-r3-20260724-dot-dompe-dev-439304.uc.r.appspot.com>
- Homepage: [8090-design-preview-home-desktop.webp](evidence/8090-design-preview-home-desktop.webp)
- Evaluation workspace: [8090-design-preview-workspace-desktop.webp](evidence/8090-design-preview-workspace-desktop.webp)
- Result: [8090-design-preview-result-desktop.webp](evidence/8090-design-preview-result-desktop.webp)

Judge execution, PRD Score execution, progress streaming, privacy behavior, and
the JSON contract are unchanged. The HTML export now preserves hard gates,
coverage notices, acknowledged findings, source-versus-derived evidence, and
the supplied Söhne typography.

## Blocking review findings resolved

- Print and saved-PDF verdicts no longer depend on browser background printing.
- Only `used` evidence is rendered as a source quotation; summaries and other
  derived evidence are explicitly labeled as not quotations.
- Primary and supporting upload controls have visible keyboard focus.
- The dashed primary dropzone now accepts file drops through the same validation
  path used by the picker.
- Supporting-evidence open/close and file-picking states are discoverable.
- The evaluation CTA has the strongest contrast in the workspace.
- HTML exports include gates, warnings, acknowledged status, and embedded Söhne
  font payloads.

## Validation evidence

- TypeScript type check passed.
- Production frontend build passed.
- Public-preview and live-mode browser suites passed.
- Desktop homepage and result passed axe WCAG 2.2 AA checks.
- Tablet and narrow-mobile sanity checks passed with no horizontal overflow.
- The deployed preview loaded Söhne, Söhne Mono, the 8090 mark, and the
  painterly image without browser errors.
- The HTML export remained self-contained and passed the existing content and
  hierarchy assertions.
- A source scan found no gradients, shadows, glass/backdrop blur, decorative
  emoji, or non-token color values in the UI stylesheet.

## Non-blocking follow-up

Opus recorded P2 follow-ups for print-row spacing, minor export-label parity,
synthetic mono bolding in exports, lazy-loading export-only fonts, two untested
export branches, dropzone helper copy, and narrow-layout ordering. None blocks
the desktop-first release.
