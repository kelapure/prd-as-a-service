import { useMemo, useRef, useState } from "react";

import { EvaluationCancelledError, evaluatePrd } from "../lib/evaluate";
import type { JudgeEnvelope, ProgressPhase, ProgressUpdate } from "../types/judge";


const ACCEPTED = ".pdf,.docx,.md,.txt";
const MAX_BYTES = 25 * 1024 * 1024;
const PHASES: Array<{ id: ProgressPhase; label: string }> = [
  { id: "uploading", label: "Uploading" },
  { id: "extracting_evidence", label: "Extracting evidence" },
  { id: "applying_gates", label: "Applying gates" },
  { id: "forming_judgment", label: "Forming judgment" },
  { id: "scoring_draft", label: "Scoring draft strength" },
  { id: "validating_report", label: "Validating report" },
];

interface EvaluationWorkspaceProps {
  onResult: (result: JudgeEnvelope) => void;
}

function validateFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (![".pdf", ".docx", ".md", ".txt"].includes(extension)) {
    return "Use PDF, DOCX, Markdown, or TXT. Legacy .doc files are not supported.";
  }
  return null;
}

export function EvaluationWorkspace({ onResult }: EvaluationWorkspaceProps) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [primary, setPrimary] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [supporting, setSupporting] = useState<File[]>([]);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [seenPhases, setSeenPhases] = useState<ProgressPhase[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  const totalBytes = useMemo(
    () => (
      (mode === "file" ? primary?.size || 0 : new TextEncoder().encode(pastedText).byteLength)
      + supporting.reduce((total, file) => total + file.size, 0)
    ),
    [mode, pastedText, primary, supporting],
  );
  const visiblePhases = PHASES.filter(
    (phase) => phase.id !== "scoring_draft" || seenPhases.includes("scoring_draft"),
  );
  const activeIndex = progress ? visiblePhases.findIndex((phase) => phase.id === progress.phase) : -1;

  const trackProgress = (update: ProgressUpdate) => {
    setSeenPhases((phases) => (phases.includes(update.phase) ? phases : [...phases, update.phase]));
    setProgress(update);
  };

  const choosePrimary = (file: File | null) => {
    setError("");
    if (!file) return setPrimary(null);
    const validation = validateFile(file);
    if (validation) return setError(validation);
    setPrimary(file);
  };

  const chooseSupporting = (files: FileList | null) => {
    setError("");
    const next = Array.from(files || []);
    if (next.length > 5) return setError("Add no more than five supporting files.");
    const invalid = next.map(validateFile).find(Boolean);
    if (invalid) return setError(invalid);
    setSupporting(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "file" && !primary) return setError("Choose one PRD to evaluate.");
    if (mode === "paste" && pastedText.trim().length < 50) {
      return setError("Paste at least 50 characters of PRD content.");
    }
    if (totalBytes > MAX_BYTES) return setError("Combined uploads exceed the 25 MB limit.");

    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    setSeenPhases(["uploading"]);
    setProgress({ phase: "uploading", message: "Preparing an ephemeral evaluation" });
    try {
      const result = await evaluatePrd(
        {
          primaryFile: mode === "file" ? primary || undefined : undefined,
          pastedText: mode === "paste" ? pastedText : undefined,
          supportingFiles: supporting,
        },
        trackProgress,
        controller.signal,
      );
      setPrimary(null);
      setPastedText("");
      setSupporting([]);
      onResult(result);
    } catch (caught) {
      if (caught instanceof EvaluationCancelledError) {
        setNotice(caught.message);
      } else {
        setError(caught instanceof Error ? caught.message : "The evaluation could not be completed.");
      }
    } finally {
      controllerRef.current = null;
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <section className="workspace section-shell" id="evaluate" aria-labelledby="evaluate-title">
      <div className="section-heading">
        <p className="eyebrow">Evaluate one PRD</p>
        <h2 id="evaluate-title">Bring the document. Leave with a decision and an improvement path.</h2>
        <p>
          Upload the primary PRD once. The Judge decides readiness while PRD Score independently measures draft strength against the same supplied evidence.
        </p>
      </div>

      <form className="evaluation-form" onSubmit={submit} noValidate>
        <div className="mode-switch" role="group" aria-label="PRD input method">
          <button
            type="button"
            aria-pressed={mode === "file"}
            className={mode === "file" ? "is-active" : ""}
            onClick={() => setMode("file")}
            disabled={running}
          >
            Upload a file
          </button>
          <button
            type="button"
            aria-pressed={mode === "paste"}
            className={mode === "paste" ? "is-active" : ""}
            onClick={() => setMode("paste")}
            disabled={running}
          >
            Paste text
          </button>
        </div>

        {mode === "file" ? (
          <div className="upload-field">
            <label
              className="drop-field"
              htmlFor="primary-prd"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!running) choosePrimary(event.dataTransfer.files?.[0] || null);
              }}
            >
              <span className="drop-title">{primary ? primary.name : "Choose the PRD"}</span>
              <span>{primary ? `${(primary.size / 1024 / 1024).toFixed(2)} MB` : "PDF, DOCX, Markdown, or TXT"}</span>
              <span className="button button-secondary">Browse files</span>
            </label>
            <input
              id="primary-prd"
              className="visually-hidden"
              type="file"
              accept={ACCEPTED}
              onChange={(event) => choosePrimary(event.target.files?.[0] || null)}
              disabled={running}
            />
          </div>
        ) : (
          <div className="paste-field">
            <label htmlFor="prd-text">PRD text</label>
            <textarea
              id="prd-text"
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              placeholder="Paste the complete PRD here. Content is held in this page only until the evaluation completes."
              rows={12}
              maxLength={250_000}
              disabled={running}
            />
            <p className="field-note">{pastedText.length.toLocaleString()} / 250,000 characters</p>
          </div>
        )}

        <details className="supporting-disclosure">
          <summary>
            <span>Add supporting evidence</span>
            <span className="supporting-summary-meta">
              <span>Optional · up to five files</span>
              <span className="supporting-prompt supporting-prompt-open">Open</span>
              <span className="supporting-prompt supporting-prompt-close">Close</span>
            </span>
          </summary>
          <div className="supporting-body">
            <input
              id="supporting-files"
              className="visually-hidden"
              type="file"
              accept={ACCEPTED}
              multiple
              onChange={(event) => chooseSupporting(event.target.files)}
              disabled={running}
            />
            <label className="supporting-picker button button-secondary" htmlFor="supporting-files">
              {supporting.length
                ? `${supporting.length} supporting file${supporting.length === 1 ? "" : "s"} selected`
                : "Choose supporting files"}
            </label>
            <p className="field-note">Discovery notes, business cases, architecture audits, or source material</p>
            {supporting.length > 0 && (
              <ul className="file-list" aria-label="Selected supporting files">
                {supporting.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}
              </ul>
            )}
          </div>
        </details>

        <div className="privacy-note">
          <strong>No EvalGPT document storage.</strong> Files are processed for this run and are not written to application storage. Export the report before closing the page.
        </div>

        {running && progress && (
          <div className="progress-panel" role="status" aria-live="polite">
            <p className="progress-message">{progress.message}</p>
            <ol className="phase-list">
              {visiblePhases.map((phase, index) => (
                <li
                  key={phase.id}
                  className={index < activeIndex ? "is-complete" : index === activeIndex ? "is-current" : ""}
                  aria-current={index === activeIndex ? "step" : undefined}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>{phase.label}
                </li>
              ))}
            </ol>
          </div>
        )}

        {error && (
          <div className="form-error" role="alert">
            <strong>Evaluation not completed.</strong>
            <p>{error}</p>
          </div>
        )}
        {notice && (
          <p className="form-notice" role="status">{notice}</p>
        )}

        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={running}>
            {running ? "Evaluation in progress" : "Evaluate this PRD"}
          </button>
          {running && (
            <button className="button button-text" type="button" onClick={() => controllerRef.current?.abort()}>
              Cancel evaluation
            </button>
          )}
          <span className="field-note">25 MB combined limit · No account required</span>
        </div>
      </form>
    </section>
  );
}
