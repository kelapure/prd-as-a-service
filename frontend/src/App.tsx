import { useEffect, useRef, useState } from "react";

import { AccessGate } from "./components/AccessGate";
import { EvaluationWorkspace } from "./components/EvaluationWorkspace";
import { JudgeResult } from "./components/JudgeResult";
import { useWorkspaceAuth } from "./contexts/WorkspaceAuthContext";
import brandMark from "./assets/brand/8090-mark-dark.png";
import footerArt from "./assets/brand/letterhead-footer.webp";
import heroPainting from "./assets/brand/twin-stacks-close.webp";
import { EXAMPLE_RESULT } from "./data/exampleResult";
import type { JudgeEnvelope } from "./types/judge";


const PUBLIC_EVALUATIONS_ENABLED = import.meta.env.VITE_PUBLIC_EVALUATIONS_ENABLED === "true";

const RUBRIC = [
  "Business problem",
  "Current process",
  "Solution alignment",
  "Plain language",
  "Technical requirements",
  "Feature specificity",
  "Success criteria",
  "Structure",
  "Scope discipline",
  "Engineering readiness",
  "Task decomposability",
  "Falsifiable bet",
];

export default function App() {
  const [result, setResult] = useState<JudgeEnvelope | null>(null);
  const auth = useWorkspaceAuth();
  const previousIdentity = useRef<string | null>(null);

  useEffect(() => {
    const currentIdentity = auth.access?.identity.email || null;
    const identityChanged = Boolean(
      previousIdentity.current
      && currentIdentity
      && previousIdentity.current !== currentIdentity,
    );
    if (!auth.everAuthorized || identityChanged) {
      setResult(null);
    }
    previousIdentity.current = currentIdentity;
  }, [auth.access?.identity.email, auth.everAuthorized]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const revealResult = (next: JudgeEnvelope) => {
    setResult(next);
    window.setTimeout(() => {
      const element = document.getElementById("judge-result");
      element?.scrollIntoView({ behavior: "auto", block: "start" });
      element?.focus({ preventScroll: true });
    }, 0);
  };

  const showExample = () => revealResult(EXAMPLE_RESULT);

  if (auth.authRequired && !auth.everAuthorized) {
    return <AccessGate />;
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="EvalGPT home">
          <img className="brand-mark" src={brandMark} alt="" />
          <span>EvalGPT</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#methodology">Methodology</a>
          {PUBLIC_EVALUATIONS_ENABLED
            ? <button type="button" onClick={showExample}>Example result</button>
            : <a href="#evaluate">Access status</a>}
          <button
            className="header-cta"
            type="button"
            onClick={PUBLIC_EVALUATIONS_ENABLED ? () => scrollTo("evaluate") : showExample}
          >
            {PUBLIC_EVALUATIONS_ENABLED ? "Evaluate a PRD" : "View example"}
          </button>
        </nav>
        {auth.authRequired && (
          <div className="session-controls">
            <span>{auth.access?.identity.email || "8090 Workspace"}</span>
            <button type="button" onClick={auth.signOut}>Sign out</button>
          </div>
        )}
      </header>

      <main id="main">
        <section className="hero section-shell" id="top">
          <div className="hero-copy">
            <p className="eyebrow">PRD Judge</p>
            <h1>Know if your PRD is ready to build.</h1>
            <p className="hero-lede">
              {PUBLIC_EVALUATIONS_ENABLED
                ? "Upload a PRD to get a verdict, a deterministic readiness score, an evidence-backed path to GO, and a separate draft-strength diagnostic. Every finding explains what failed, why it matters, where the evidence came from, and the smallest credible fix."
                : "PRD Judge is an evidence-backed readiness decision, not another writing score. Explore a synthetic example now. Document evaluation will open only after the exact judge, model, evidence, and privacy controls pass final certification."}
            </p>
            <div className="hero-actions">
              {PUBLIC_EVALUATIONS_ENABLED ? (
                <>
                  <button className="button button-primary" type="button" onClick={() => scrollTo("evaluate")}>Evaluate a PRD</button>
                  <button className="button button-secondary" type="button" onClick={showExample}>View an example result</button>
                </>
              ) : (
                <>
                  <button className="button button-primary" type="button" onClick={showExample}>View a synthetic example</button>
                  <button className="button button-secondary" type="button" onClick={() => scrollTo("methodology")}>Read the methodology</button>
                </>
              )}
            </div>
          </div>
          <div className="hero-visual">
            <img className="hero-painting" src={heroPainting} alt="" />
            <div className="decision-specimen" aria-label="Example verdict summary">
              <p className="eyebrow">{PUBLIC_EVALUATIONS_ENABLED ? "Example result" : "Synthetic example"}</p>
              <div className="specimen-score"><span>5</span>/10</div>
              <p className="specimen-verdict">Revise</p>
              <p>The product direction is credible. Two unowned decisions still block a safe handoff.</p>
              <div className="specimen-rule" />
              <p className="specimen-next"><span>01</span> Define the investment threshold.</p>
              <p className="specimen-next"><span>02</span> Assign the manual override path.</p>
            </div>
          </div>
        </section>

        <section className="value-section section-shell">
          <div className="section-heading narrow-heading">
            <p className="eyebrow">Two instruments. One ordered result.</p>
            <h2>Readiness and draft strength answer different questions.</h2>
            <p>PRD Judge decides whether the product is ready to build. PRD Score separately shows how to strengthen the document without changing that verdict.</p>
          </div>
          <div className="value-grid">
            <article><span>01</span><h3>A decision, not an average.</h3><p>Go, Revise, Hold, Wrong artifact, or Architecture audit required.</p></article>
            <article><span>02</span><h3>A path to GO.</h3><p>Blockers are ordered by decision impact, not by how easy they are to rewrite.</p></article>
            <article><span>03</span><h3>Evidence you can inspect.</h3><p>Material findings cite supplied text or state exactly what evidence is missing.</p></article>
            <article><span>04</span><h3>An improvement gradient, kept secondary.</h3><p>Anchored dimensions identify the weakest draft areas without overruling the judge.</p></article>
          </div>
        </section>

        {PUBLIC_EVALUATIONS_ENABLED ? (
          <EvaluationWorkspace onResult={revealResult} />
        ) : (
          <section className="availability-section section-shell" id="evaluate" aria-labelledby="availability-title">
            <div className="availability-intro">
              <p className="eyebrow">Evaluation access</p>
              <h2 id="availability-title">The interface is ready. Live judgment is not open yet.</h2>
              <p>
                We will not accept PRDs until the frozen certification suite, the approved production model, and provider retention terms are verified for the exact deployed runtime. You can inspect the complete synthetic result now.
              </p>
              <div className="availability-actions">
                <button className="button button-primary" type="button" onClick={showExample}>View the example result</button>
                <button className="button availability-method-link" type="button" onClick={() => scrollTo("methodology")}>Read the methodology</button>
              </div>
            </div>
            <div className="availability-status" aria-label="Public evaluation release status">
              <div className="availability-row">
                <span className="availability-state state-complete">Complete</span>
                <p><strong>Result contract and browser exports</strong><span>The verdict, path to GO, evidence ledger, rubric, and separate draft-strength diagnostic render in one ordered report.</span></p>
              </div>
              <div className="availability-row">
                <span className="availability-state state-complete">Complete</span>
                <p><strong>Fable UX review</strong><span>The responsive interface and realistic result states passed the required fresh-context review.</span></p>
              </div>
              <div className="availability-row">
                <span className="availability-state state-progress">In progress</span>
                <p><strong>Frozen model certification</strong><span>The exact production judge and model must meet the false-GO, evidence, precision, and recall thresholds.</span></p>
              </div>
              <div className="availability-row">
                <span className="availability-state state-required">Required</span>
                <p><strong>Privacy and comprehension evidence</strong><span>Provider retention terms and target-user comprehension must be verified before document access opens.</span></p>
              </div>
            </div>
          </section>
        )}
        {result && <JudgeResult result={result} onReset={() => { setResult(null); scrollTo("evaluate"); }} />}

        <section className="method-section section-shell" id="methodology">
          <div className="method-statement">
            <p className="eyebrow">Methodology</p>
            <h2>Verdict first. Hard gates before polish.</h2>
            <p>Missing evidence stays missing. Blockers require support. The readiness score is derived deterministically from the verdict and validated findings. Draft strength is calculated separately and is never blended into readiness.</p>
          </div>
          <div className="method-steps">
            <article><span>01</span><h3>Classify the artifact.</h3><p>Do not grade a sales deck or architecture note as though it were a PRD.</p></article>
            <article><span>02</span><h3>Apply stage-aware gates.</h3><p>Wrong artifact, missing evidence, architecture, AI evaluation, regulated controls, and delivery gaps can block first.</p></article>
            <article><span>03</span><h3>Derive, then diff.</h3><p>Work out what this product must address, then test the document against that obligation set.</p></article>
            <article><span>04</span><h3>Validate every claim.</h3><p>Quotes are checked against supplied sources before the score is computed.</p></article>
          </div>
        </section>

        <section className="rubric-section section-shell" aria-labelledby="rubric-title">
          <div className="section-heading narrow-heading">
            <p className="eyebrow">PRD Eval Rubric v2</p>
            <h2 id="rubric-title">Twelve diagnostic checks. One separate readiness decision.</h2>
            <p>The rubric shows where the PRD is strong or thin. A high rubric count cannot average away a hard gate.</p>
          </div>
          <ol className="rubric-index">
            {RUBRIC.map((criterion, index) => (
              <li key={criterion}><span>C{index + 1}</span>{criterion}</li>
            ))}
          </ol>
        </section>

        <section className="privacy-section section-shell" id="privacy">
          <div>
            <p className="eyebrow">Privacy</p>
            <h2>{PUBLIC_EVALUATIONS_ENABLED ? "Your document is an input, not an account asset." : "No document upload is accepted in this preview."}</h2>
          </div>
          <div className="privacy-copy">
            {PUBLIC_EVALUATIONS_ENABLED ? (
              <>
                <p>EvalGPT processes uploads in memory for the active evaluation and does not write source documents, extracted text, findings, or evidence to application storage, analytics, or browser local storage.</p>
                <p>Workspace authentication is kept in this tab&apos;s memory. Firestore stores only HMAC-pseudonymous quota counters and short-lived concurrency leases, with a 90-day inactivity TTL.</p>
                <p>The production subprocessor and exact retention behavior are published only after they are verified for the deployed API account. EvalGPT does not claim provider-side zero retention or no training without that verification.</p>
                <p>Closing or refreshing the page loses the report unless you export it.</p>
              </>
            ) : (
              <>
                <p>The public preview does not send, process, or store a PRD because there is no upload or paste control.</p>
                <p>The example result is synthetic and contains no client material. It is rendered entirely from data shipped with this site.</p>
                <p>The production subprocessor and exact retention behavior will be published before live evaluation opens.</p>
              </>
            )}
          </div>
        </section>
      </main>

      <img className="footer-art" src={footerArt} alt="" />
      <footer className="site-footer">
        <div className="brand"><img className="brand-mark" src={brandMark} alt="" /><span>EvalGPT</span></div>
        <p>Evidence-backed PRD judgment.</p>
        <nav aria-label="Footer navigation"><button type="button" onClick={showExample}>Example result</button><a href="#methodology">Methodology</a><a href="#privacy">Privacy</a><a href="#top">Back to top</a></nav>
      </footer>
    </>
  );
}
