import type { JudgeEnvelope } from "../types/judge";
import tokens from "../styles/8090-tokens.css?raw";
import {
  humanize,
  SCORE_NAMES,
  scoreDisplay,
  scoreFixParts,
  VERDICT_LABELS,
} from "./presentation";


function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function download(name: string, type: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(result: JudgeEnvelope): void {
  download("evalgpt-prd-judge-report.json", "application/json", `${JSON.stringify(result, null, 2)}\n`);
}

export function downloadHtml(result: JudgeEnvelope): void {
  const findings = result.report.findings
    .map(
      (finding) => `<article class="finding">
        <p class="label">${escapeHtml(finding.severity)}${finding.gate ? ` · ${escapeHtml(humanize(finding.gate))}` : ""}</p>
        <h2>${escapeHtml(finding.title)}</h2>
        <p><strong>Impact.</strong> ${escapeHtml(finding.impact)}</p>
        <p><strong>Required fix.</strong> ${escapeHtml(finding.required_fix)}</p>
        ${finding.evidence.map((item) => `<blockquote><span>${escapeHtml(item.status)}</span> “${escapeHtml(item.quote)}”<br><small>${escapeHtml(item.source)}${item.locator ? ` · ${escapeHtml(item.locator)}` : ""}</small></blockquote>`).join("")}
      </article>`,
    )
    .join("");
  const actions = result.report.required_next_actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const rubric = result.rubric.criteria
    .map((item) => `<article class="rubric-row"><p class="label">${escapeHtml(item.id)} · ${escapeHtml(item.status)}${item.structural_deferral ? " · structural deferral" : ""}</p><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.rationale)}</p>${item.evidence.map((evidence) => `<blockquote><span>${escapeHtml(evidence.status)}</span> “${escapeHtml(evidence.quote)}”${evidence.locator ? `<br><small>${escapeHtml(evidence.locator)}</small>` : ""}</blockquote>`).join("")}</article>`)
    .join("");
  const ledger = result.report.evidence_ledger
    .map((item) => `<tr><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.notes)}</td></tr>`)
    .join("");
  const scoreReport = result.prd_score.report;
  const scoreRows = scoreReport
    ? [...scoreReport.layer1, ...scoreReport.layer2, ...scoreReport.layer3.scores, ...scoreReport.writing_layer]
      .map((item) => `<article class="rubric-row"><p class="label">${escapeHtml(item.id)} · ${escapeHtml(SCORE_NAMES[item.id] || item.id)} · ${escapeHtml(scoreDisplay(item.score, item.adjusted_score ?? undefined))}${item.id.startsWith("W") ? " · writing layer, unvalidated" : ""}</p><h3>${escapeHtml(item.anchor)}</h3>${item.fix ? `<p><strong>One-level improvement.</strong> ${escapeHtml(item.fix)}</p>` : ""}${item.evidence.map((evidence) => `<blockquote><span>${escapeHtml(evidence.status)}</span> “${escapeHtml(evidence.quote)}”<br><small>${escapeHtml(evidence.source)}${evidence.locator ? ` · ${escapeHtml(evidence.locator)}` : ""}</small></blockquote>`).join("")}</article>`)
      .join("")
    : "";
  const scoreFixes = scoreReport?.fix_plan_ranked
    .map((fix) => {
      const parts = scoreFixParts(fix);
      const label = parts.id ? `Score ${parts.id} · ${parts.name}` : parts.name;
      return `<li><strong>${escapeHtml(label)}.</strong> ${escapeHtml(parts.action)}</li>`;
    })
    .join("") || "";
  const scoreFixPlan = scoreFixes
    ? `<h2>Improve after the Path to GO</h2><ol>${scoreFixes}</ol>`
    : "<p>No one-level draft fix is required for the three lowest dimensions.</p>";
  const draftStrength = result.prd_score.status === "complete" && scoreReport?.totals
    ? `<section class="section"><p class="eyebrow">Secondary authoring diagnostic</p><div class="score">${scoreReport.totals.final}/${scoreReport.totals.denominator} · Draft strength</div><p><strong>This score does not change the readiness verdict.</strong> PRD Judge remains authoritative.</p><p>Core rubric calibrated on five PRDs. Writing layer unvalidated. PRD Score dimension IDs are independent from the C1–C12 coverage checks later in this report.</p><p>${escapeHtml(scoreReport.anchor_placement)}</p>${scoreFixPlan}<p><strong>Length normalization.</strong> ${escapeHtml(scoreReport.length_normalization.detail)}</p><p><strong>Historical threshold.</strong> ${scoreReport.totals.historical_threshold}/${scoreReport.totals.denominator}; calibration context only.</p><h2>Anchored dimensions</h2>${scoreRows}</section>`
    : `<section class="section"><p class="eyebrow">Secondary authoring diagnostic</p><h2>Draft strength ${result.prd_score.status === "not_scored" ? "was not scored" : "unavailable"}</h2><p>${result.prd_score.status === "not_scored" && scoreReport ? `${escapeHtml(scoreReport.artifact_gate.reason)} No partial score was produced. The readiness judgment is complete and unaffected.` : escapeHtml(result.prd_score.validation.warnings?.[0] || "The separate draft-strength diagnostic did not return a validated report; the readiness judgment is unaffected.")}</p></section>`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EvalGPT PRD Judge report</title><style>
${tokens}
*{box-sizing:border-box}body{margin:0;background:var(--bg-canvas);color:var(--fg-1);font-family:var(--font-body);font-size:var(--fs-16);line-height:var(--lh-16)}main{max-width:980px;margin:auto;padding:var(--space-12) var(--space-6)}.eyebrow,.label,small,th,td{font-family:var(--font-mono)}.eyebrow,.label{font-size:var(--fs-12);font-weight:600;letter-spacing:var(--tracking-caps);text-transform:uppercase}.hero{background:var(--bg-ink);color:var(--fg-on-dark-1);padding:var(--space-10);border:1px solid var(--border-ink)}.score{font-family:var(--font-mono);font-size:clamp(var(--fs-48),10vw,var(--fs-96));font-weight:600;line-height:1;margin:var(--space-2) 0}.summary{font-size:var(--fs-24);max-width:760px}.section{border-top:1px solid var(--border-soft);padding:var(--space-8) 0}.finding,.rubric-row{background:var(--bg-surface);border:1px solid var(--border-soft);padding:var(--space-6);margin:var(--space-4) 0}.finding h2,.rubric-row h3{margin:var(--space-1) 0 var(--space-4)}blockquote{border-left:3px solid var(--status-info);margin:var(--space-4) 0 0;padding:var(--space-3) var(--space-4);background:var(--bg-surface-sunk)}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border-bottom:1px solid var(--border-soft);padding:var(--space-3) var(--space-2)}footer{color:var(--fg-3);font-size:var(--fs-12);margin-top:var(--space-12)}@media print{body{background:var(--color-chalk-bright)}main{max-width:none;padding:0}.finding,.rubric-row{break-inside:avoid}}</style></head>
<body><main><section class="hero"><p class="eyebrow">PRD Judge · Public beta</p><div class="score">${result.readiness_score.value}/10 · ${escapeHtml(VERDICT_LABELS[result.report.verdict])}</div><p class="summary">${escapeHtml(result.report.summary)}</p><p>${escapeHtml(result.report.confidence.charAt(0).toUpperCase() + result.report.confidence.slice(1))} confidence · ${escapeHtml(humanize(result.report.artifact_type))}</p></section>
<section class="section"><p class="eyebrow">Path to GO</p><ol>${actions}</ol></section>
<section class="section"><p class="eyebrow">Evidence-backed findings</p>${findings || "<p>No findings.</p>"}</section>
${draftStrength}
<section class="section"><p class="eyebrow">Evidence ledger</p><table><thead><tr><th>Source</th><th>Status</th><th>Notes</th></tr></thead><tbody>${ledger}</tbody></table></section>
<section class="section"><p class="eyebrow">PRD Eval Rubric v2 · secondary diagnostic</p>${rubric}</section>
<footer>EvalGPT public beta · Judge ${escapeHtml(result.versions.judge)} · Source commit ${escapeHtml(result.versions.judge_source_commit)} · Manifest ${escapeHtml(result.versions.judge_manifest_sha256)} · Model ${escapeHtml(result.versions.model)} · PRD Score ${escapeHtml(result.versions.prd_score)} · PRD Score source ${escapeHtml(result.versions.prd_score_source_commit)} · PRD Score manifest ${escapeHtml(result.versions.prd_score_manifest_sha256)} · PRD Score model ${escapeHtml(result.versions.prd_score_model)} · Rubric ${escapeHtml(result.versions.rubric)}${result.versions.rubric_sha256 ? ` · Rubric hash ${escapeHtml(result.versions.rubric_sha256)}` : ""} · Readiness projection ${escapeHtml(result.versions.score_derivation)} · Evidence ${result.validation.used_quotes_verified ? "verified" : "unverified"} · Source documents were not embedded in this export.</footer></main></body></html>`;
  download("evalgpt-prd-judge-report.html", "text/html", html);
}
