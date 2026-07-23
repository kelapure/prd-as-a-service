import { downloadHtml, downloadJson } from "../lib/exportResult";
import type { JudgeEnvelope, Verdict } from "../types/judge";


const VERDICT_LABELS: Record<Verdict, string> = {
  GO: "Go",
  REVISE: "Revise",
  HOLD: "Hold",
  WRONG_ARTIFACT: "Wrong artifact",
  DISQUALIFY_UNTIL_ARCHITECTURE_AUDIT: "Architecture audit required",
};

function humanize(value: string): string {
  const artifactLabels: Record<string, string> = {
    "prd-lite": "PRD-Lite",
    "full-prd": "Full PRD",
    "mini-prd": "Mini-PRD",
    "rfp-rfi-response": "RFP/RFI response",
  };
  if (artifactLabels[value]) return artifactLabels[value];
  const acronyms = new Set(["ai", "prd", "rbac", "rfp", "rfi", "roi"]);
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .map((word) => acronyms.has(word.toLowerCase()) ? word.toUpperCase() : word)
    .join(" ");
}

interface JudgeResultProps {
  result: JudgeEnvelope;
  onReset: () => void;
}

export function JudgeResult({ result, onReset }: JudgeResultProps) {
  const { report, readiness_score: score, rubric } = result;
  const blockers = report.findings.filter((finding) => finding.severity !== "P2" && !finding.acknowledged);
  const severityCounts = report.findings.reduce<Record<string, number>>(
    (counts, finding) => ({ ...counts, [finding.severity]: (counts[finding.severity] || 0) + 1 }),
    { P0: 0, P1: 0, P2: 0 },
  );
  const example = result.run.id === "example_public_beta";
  const printReport = () => {
    const closed = Array.from(document.querySelectorAll<HTMLDetailsElement>("#judge-result details:not([open])"));
    closed.forEach((detail) => { detail.open = true; });
    window.print();
    closed.forEach((detail) => { detail.open = false; });
  };

  return (
    <section
      className="result-shell section-shell"
      id="judge-result"
      tabIndex={-1}
      aria-labelledby="result-title"
    >
      <header className="verdict-panel">
        <p className="eyebrow">PRD Judge · Public beta{example ? " · Example result" : ""}</p>
        <div className="verdict-lockup">
          <p className="score" aria-label={`Readiness score ${score.value} out of ${score.out_of}`}>{score.value}<span>/{score.out_of}</span></p>
          <div>
            <p className="verdict-label">{VERDICT_LABELS[report.verdict]}</p>
            <p className="result-meta">{humanize(report.artifact_type)} · {report.confidence} confidence</p>
          </div>
        </div>
        <h2 id="result-title">{report.summary}</h2>
        {report.required_next_actions[0] && (
          <div className="verdict-next-action">
            <p className="eyebrow">First move on the path to GO</p>
            <p>{report.required_next_actions[0]}</p>
            <a href="#path-title">See the complete decision sequence</a>
          </div>
        )}
        <details className="score-explainer">
          <summary>How this score works</summary>
          <p>The verdict sets the score band. Validated blockers move the score only within that band. The model never sees, produces, or averages this number.</p>
        </details>
      </header>

      <div className="result-actions no-print" aria-label="Report exports">
        <button className="button button-secondary" type="button" onClick={printReport}>Print or save PDF</button>
        <button className="button button-secondary" type="button" onClick={() => downloadHtml(result)}>Download HTML</button>
        <button className="button button-secondary" type="button" onClick={() => downloadJson(result)}>Download JSON</button>
        <button className="button button-text" type="button" onClick={onReset}>Evaluate another PRD</button>
      </div>

      <div className="result-grid">
        <main className="result-main">
          <section className="result-section path-section" aria-labelledby="path-title">
            <p className="eyebrow">Decision sequence</p>
            <h3 id="path-title">Path to GO</h3>
            {report.required_next_actions.length ? (
              <ol className="action-list">
                {report.required_next_actions.map((action, index) => (
                  <li key={action}><span>{String(index + 1).padStart(2, "0")}</span><p>{action}</p></li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">No blocking action remains. Preserve the acknowledged gaps and validation evidence through handoff.</p>
            )}
          </section>

          <section className="result-section" aria-labelledby="findings-title">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Evidence before opinion</p>
                <h3 id="findings-title">Findings</h3>
              </div>
              <p className="finding-count">
                {blockers.length} blocker{blockers.length === 1 ? "" : "s"}
                {severityCounts.P2 > 0 ? ` · ${severityCounts.P2} advisor${severityCounts.P2 === 1 ? "y" : "ies"}` : ""}
              </p>
            </div>
            {report.findings.length ? (
              <div className="findings-list">
                {report.findings.map((finding, index) => (
                  <article className={`finding finding-${finding.severity.toLowerCase()}`} key={`${finding.title}-${index}`}>
                    <div className="finding-topline">
                      <p className="severity">{finding.severity}</p>
                      {finding.gate && <p className="gate-label">{humanize(finding.gate)}</p>}
                      {finding.acknowledged && <p className="acknowledged-label">Acknowledged</p>}
                    </div>
                    <h4>{finding.title}</h4>
                    <dl className="finding-body">
                      <div><dt>Impact</dt><dd>{finding.impact}</dd></div>
                      <div><dt>Required fix</dt><dd>{finding.required_fix}</dd></div>
                    </dl>
                    <details className="evidence-disclosure" open={index === 0}>
                      <summary>Inspect evidence</summary>
                      {finding.evidence.map((evidence, evidenceIndex) => (
                        <blockquote key={`${evidence.source}-${evidenceIndex}`}>
                          <p className="evidence-status">{evidence.status}</p>
                          <p>“{evidence.quote}”</p>
                          <cite>{evidence.source}{evidence.locator ? ` · ${evidence.locator}` : ""}</cite>
                        </blockquote>
                      ))}
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">No material findings. Nothing blocks this PRD at its current stage.</p>
            )}
          </section>

          <section className="result-section">
            <details className="wide-disclosure">
              <summary>
                <span><span className="eyebrow">Secondary diagnostic</span>PRD Eval Rubric v2</span>
                <span className="disclosure-meta"><strong>{rubric.pass_count}/12 pass</strong><span className="disclosure-prompt prompt-open">Open diagnostic ↓</span><span className="disclosure-prompt prompt-close">Close diagnostic ↑</span></span>
              </summary>
              <p className="disclosure-intro">The rubric diagnoses coverage. It does not override the PRD Judge verdict.</p>
              <div className="rubric-list">
                {rubric.criteria.map((criterion) => (
                  <details key={criterion.id} className="rubric-row">
                    <summary>
                      <span className="criterion-id">{criterion.id}</span>
                      <span>{criterion.name}{criterion.structural_deferral ? " · structural deferral" : ""}</span>
                      <strong className={`criterion-${criterion.status}`}>{criterion.status}</strong>
                    </summary>
                    <div>
                      <p>{criterion.rationale}</p>
                      {criterion.evidence.map((evidence, index) => (
                        <blockquote key={index}>“{evidence.quote}” {evidence.locator && <cite>· {evidence.locator}</cite>}</blockquote>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          </section>

          <section className="result-section">
            <details className="wide-disclosure">
              <summary>
                <span><span className="eyebrow">Source accounting</span>Evidence ledger</span>
                <span className="disclosure-meta"><strong>{report.evidence_ledger.length} sources</strong><span className="disclosure-prompt prompt-open">Open ledger ↓</span><span className="disclosure-prompt prompt-close">Close ledger ↑</span></span>
              </summary>
              <div className="ledger-list">
                {report.evidence_ledger.map((row, index) => (
                  <div key={`${row.source}-${index}`}>
                    <p><strong>{row.source}</strong><span>{row.status}</span></p>
                    <p>{row.notes}</p>
                  </div>
                ))}
              </div>
            </details>
          </section>
        </main>

        <aside className="result-aside" aria-label="Judgment facts">
          <div className="fact-panel">
            <p className="eyebrow">Findings by severity</p>
            <dl>
              <div><dt>P0</dt><dd>{severityCounts.P0}</dd></div>
              <div><dt>P1</dt><dd>{severityCounts.P1}</dd></div>
              <div><dt>P2</dt><dd>{severityCounts.P2}</dd></div>
              <div><dt>Gates</dt><dd>{report.gates_fired.length}</dd></div>
            </dl>
          </div>
          <div className="fact-panel">
            <p className="eyebrow">Hard gates fired</p>
            {report.gates_fired.length ? (
              <ul>{report.gates_fired.map((gate) => <li key={gate}>{humanize(gate)}</li>)}</ul>
            ) : <p>None</p>}
          </div>
          {result.input.warnings.length > 0 && (
            <div className="fact-panel">
              <p className="eyebrow">Coverage notices</p>
              <ul>{result.input.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          <details className="fact-panel version-panel">
            <summary>Methodology and versions</summary>
            <dl>
              <div><dt>Judge</dt><dd>{result.versions.judge}</dd></div>
              <div><dt>Model</dt><dd>{result.versions.model}</dd></div>
              <div><dt>Rubric</dt><dd>{result.versions.rubric}</dd></div>
              <div><dt>Score</dt><dd>{result.versions.score_derivation}</dd></div>
              <div><dt>Source commit</dt><dd className="version-hash">{result.versions.judge_source_commit}</dd></div>
              <div><dt>Judge manifest</dt><dd className="version-hash">{result.versions.judge_manifest_sha256}</dd></div>
              {result.versions.rubric_sha256 && <div><dt>Rubric hash</dt><dd className="version-hash">{result.versions.rubric_sha256}</dd></div>}
              <div><dt>Evidence</dt><dd>{result.validation.used_quotes_verified ? "Verified" : "Unverified"}</dd></div>
              <div><dt>Storage</dt><dd>{result.run.ephemeral ? "Ephemeral" : "Unknown"}</dd></div>
            </dl>
          </details>
        </aside>
      </div>
    </section>
  );
}
