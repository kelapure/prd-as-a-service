import { downloadHtml, downloadJson } from "../lib/exportResult";
import {
  humanize,
  SCORE_NAMES,
  scoreDisplay,
  scoreFixParts,
  VERDICT_LABELS,
} from "../lib/presentation";
import type { JudgeEnvelope } from "../types/judge";


interface JudgeResultProps {
  result: JudgeEnvelope;
  onReset: () => void;
}

export function JudgeResult({ result, onReset }: JudgeResultProps) {
  const { report, readiness_score: score, rubric } = result;
  const scoreDiagnostic = result.prd_score;
  const draftScore = scoreDiagnostic.report;
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
            {scoreDiagnostic.status === "complete" && draftScore?.fix_plan_ranked.length ? (
              <p className="path-bridge">
                After the readiness actions, continue with the{" "}
                <a href="#draft-strength-title">three weakest draft dimensions</a>.
              </p>
            ) : null}
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

          <section className="result-section draft-strength-section" aria-labelledby="draft-strength-title">
            {scoreDiagnostic.status === "complete" && draftScore?.totals ? (
              <>
                <div className="draft-strength-header">
                  <div>
                    <p className="eyebrow">Secondary authoring diagnostic</p>
                    <h3 id="draft-strength-title">Draft strength</h3>
                    <p className="draft-score-disclaimer">
                      This score does not change the {VERDICT_LABELS[report.verdict]} verdict.
                    </p>
                    <p className="draft-calibration-note">Core rubric calibrated on five PRDs · Writing layer unvalidated</p>
                  </div>
                  <p
                    className="draft-score-number"
                    aria-label={`Draft strength score ${draftScore.totals.final} out of ${draftScore.totals.denominator}`}
                  >
                    {draftScore.totals.final}<span>/{draftScore.totals.denominator}</span>
                  </p>
                </div>

                {draftScore.fix_plan_ranked.length ? (
                  <div className="draft-fix-panel">
                    <p className="eyebrow">Improve after the Path to GO</p>
                    <p className="draft-id-note">PRD Score dimension IDs are independent from the C1–C12 coverage checks later in this report.</p>
                    <ol>
                      {draftScore.fix_plan_ranked.map((fix, index) => {
                        const parts = scoreFixParts(fix);
                        return (
                          <li key={fix}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <p>
                              <strong>{parts.id ? `Score ${parts.id} · ${parts.name}` : parts.name}</strong>
                              {" "}{parts.action}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ) : (
                  <p className="empty-state">No one-level draft fix is required for the three lowest dimensions.</p>
                )}

                <details className="wide-disclosure draft-score-details">
                  <summary>
                    <span><span className="eyebrow">Anchored 0–5 dimensions</span>Inspect the draft score</span>
                    <span className="disclosure-meta">
                      <strong>{draftScore.totals.writing}/{draftScore.totals.writing_denominator} writing</strong>
                      <span className="disclosure-prompt prompt-open">Open scorecard ↓</span>
                      <span className="disclosure-prompt prompt-close">Close scorecard ↑</span>
                    </span>
                  </summary>
                  <div className="score-caveat">
                    <p><strong>Different instrument.</strong> PRD Score measures document strength; PRD Judge decides readiness.</p>
                    <p>The core rubric was calibrated on five outcome-labeled PRDs. The writing layer remains unvalidated and is reported separately.</p>
                    <p>{draftScore.anchor_placement}</p>
                  </div>
                  <div className="score-layer">
                    <h4>Product and execution dimensions</h4>
                    {[...draftScore.layer1, ...draftScore.layer2, ...draftScore.layer3.scores].map((criterion) => (
                      <details className="score-row" key={criterion.id}>
                        <summary>
                          <span className="criterion-id">{criterion.id}</span>
                          <span>{SCORE_NAMES[criterion.id] || criterion.id}</span>
                          <strong>{scoreDisplay(criterion.score, criterion.adjusted_score ?? undefined)}</strong>
                        </summary>
                        <div>
                          <p className="score-anchor">{criterion.anchor}</p>
                          {criterion.fix && <p><strong>One-level improvement.</strong> {criterion.fix}</p>}
                          {criterion.evidence.map((evidence, index) => (
                            <blockquote key={`${criterion.id}-${index}`}>
                              <p className="evidence-status">{evidence.status}</p>
                              <p>“{evidence.quote}”</p>
                              <cite>{evidence.source}{evidence.locator ? ` · ${evidence.locator}` : ""}</cite>
                            </blockquote>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                  <div className="score-layer">
                    <h4>Writing quality · unvalidated</h4>
                    {draftScore.writing_layer.map((criterion) => (
                      <details className="score-row" key={criterion.id}>
                        <summary>
                          <span className="criterion-id">{criterion.id}</span>
                          <span>{SCORE_NAMES[criterion.id] || criterion.id}</span>
                          <strong>{scoreDisplay(criterion.score, criterion.adjusted_score ?? undefined)}</strong>
                        </summary>
                        <div>
                          <p className="score-anchor">{criterion.anchor}</p>
                          {criterion.fix && <p><strong>One-level improvement.</strong> {criterion.fix}</p>}
                          {criterion.evidence.map((evidence, index) => (
                            <blockquote key={`${criterion.id}-${index}`}>
                              <p className="evidence-status">{evidence.status}</p>
                              <p>“{evidence.quote}”</p>
                              <cite>{evidence.source}{evidence.locator ? ` · ${evidence.locator}` : ""}</cite>
                            </blockquote>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                  <dl className="score-method-facts">
                    <div><dt>Length normalization</dt><dd>{draftScore.length_normalization.detail}</dd></div>
                    <div><dt>Hard caps</dt><dd>{draftScore.hard_caps.length ? draftScore.hard_caps.map((cap) => cap.cap).join("; ") : "None"}</dd></div>
                    <div><dt>Historical threshold</dt><dd>{draftScore.totals.historical_threshold}/{draftScore.totals.denominator} · calibration context only</dd></div>
                  </dl>
                </details>
              </>
            ) : scoreDiagnostic.status === "not_scored" && draftScore ? (
              <>
                <p className="eyebrow">Secondary authoring diagnostic</p>
                <h3 id="draft-strength-title">Draft strength was not scored</h3>
                <p className="empty-state">{draftScore.artifact_gate.reason} No partial score was produced. The readiness judgment is complete and unaffected.</p>
              </>
            ) : (
              <>
                <p className="eyebrow">Secondary authoring diagnostic</p>
                <h3 id="draft-strength-title">Draft strength unavailable</h3>
                <p className="empty-state">
                  {scoreDiagnostic.validation.warnings?.[0]
                    || "The separate draft-strength diagnostic did not return a validated report; the readiness judgment is unaffected."}
                </p>
              </>
            )}
          </section>

          <section className="result-section evidence-ledger-section">
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

          <section className="result-section rubric-diagnostic-section">
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
                        <blockquote key={index}>
                          <p className="evidence-status">{evidence.status}</p>
                          <p>“{evidence.quote}”</p>
                          {evidence.locator && <cite>{evidence.locator}</cite>}
                        </blockquote>
                      ))}
                    </div>
                  </details>
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
              <div><dt>PRD Score</dt><dd>{result.versions.prd_score}</dd></div>
              <div><dt>PRD Score model</dt><dd>{result.versions.prd_score_model}</dd></div>
              <div><dt>Source commit</dt><dd className="version-hash">{result.versions.judge_source_commit}</dd></div>
              <div><dt>Judge manifest</dt><dd className="version-hash">{result.versions.judge_manifest_sha256}</dd></div>
              <div><dt>PRD Score source</dt><dd className="version-hash">{result.versions.prd_score_source_commit}</dd></div>
              <div><dt>PRD Score manifest</dt><dd className="version-hash">{result.versions.prd_score_manifest_sha256}</dd></div>
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
