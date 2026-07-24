import { useState } from "react";

import { EvaluationWorkspace } from "./components/EvaluationWorkspace";
import { JudgeResult } from "./components/JudgeResult";
import { EXAMPLE_RESULT } from "./data/exampleResult";
import type { JudgeEnvelope } from "./types/judge";


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

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="EvalGPT home">
          <span className="brand-mark">8090</span>
          <span>EvalGPT</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#methodology">Methodology</a>
          <button type="button" onClick={showExample}>Example result</button>
          <button className="header-cta" type="button" onClick={() => scrollTo("evaluate")}>Evaluate a PRD</button>
        </nav>
      </header>

      <main id="main">
        <section className="hero section-shell" id="top">
          <div className="hero-copy">
            <p className="eyebrow">PRD Judge · Public beta</p>
            <h1>Know if your PRD is ready to build.</h1>
            <p className="hero-lede">
              Upload a PRD to get a verdict, a deterministic readiness score, an evidence-backed path to GO, and a separate draft-strength diagnostic. Every finding explains what failed, why it matters, where the evidence came from, and the smallest credible fix.
            </p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => scrollTo("evaluate")}>Evaluate a PRD</button>
              <button className="button button-secondary" type="button" onClick={showExample}>View an example result</button>
            </div>
          </div>
          <div className="decision-specimen" aria-label="Example verdict summary">
            <p className="eyebrow">Decision specimen</p>
            <div className="specimen-score"><span>5</span>/10</div>
            <p className="specimen-verdict">Revise</p>
            <p>The product direction is credible. Two unowned decisions still block a safe handoff.</p>
            <div className="specimen-rule" />
            <p className="specimen-next"><span>01</span> Define the investment threshold.</p>
            <p className="specimen-next"><span>02</span> Assign the manual override path.</p>
          </div>
        </section>

        <div className="trust-strip" aria-label="Public beta commitments">
          <span>Free during beta</span>
          <span>No account</span>
          <span>No EvalGPT document storage</span>
          <span>Exportable report</span>
        </div>

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

        <EvaluationWorkspace onResult={revealResult} />
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
            <p className="eyebrow">Privacy during public beta</p>
            <h2>Your document is an input, not an account asset.</h2>
          </div>
          <div className="privacy-copy">
            <p>EvalGPT processes uploads in memory for the active evaluation and does not write source documents, extracted text, findings, or evidence to application storage, analytics, or browser local storage.</p>
            <p>Subprocessor: the Anthropic API processes the content to return the evaluation. Provider retention is governed by the deployed API account terms; EvalGPT will not claim provider-side zero retention or no training until those terms are verified for the production account.</p>
            <p>Closing or refreshing the page loses the report unless you export it.</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand"><span className="brand-mark">8090</span><span>EvalGPT</span></div>
        <p>Evidence-backed PRD judgment. Public beta.</p>
        <nav aria-label="Footer navigation"><button type="button" onClick={showExample}>Example result</button><a href="#methodology">Methodology</a><a href="#privacy">Privacy</a><a href="#top">Back to top</a></nav>
      </footer>
    </>
  );
}
