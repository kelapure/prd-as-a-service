import type { JudgeEnvelope, ProgressUpdate } from "../types/judge";


export class EvaluationCancelledError extends Error {
  constructor() {
    super("Evaluation cancelled. Your document was not saved.");
    this.name = "EvaluationCancelledError";
  }
}

const localHostnames = new Set(["localhost", "127.0.0.1"]);
const API_BASE = import.meta.env.VITE_API_BASE
  || (localHostnames.has(window.location.hostname) ? "http://127.0.0.1:8080" : "");
const TIMEOUT_MS = 10 * 60 * 1000;

interface EvaluateInput {
  primaryFile?: File;
  pastedText?: string;
  supportingFiles: File[];
}

interface StreamEvent {
  event: string;
  data: unknown;
}

export function parseSseBlock(block: string): StreamEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  if (!data.length) return null;
  return { event, data: JSON.parse(data.join("\n")) };
}

export async function evaluatePrd(
  input: EvaluateInput,
  onProgress: (update: ProgressUpdate) => void,
  externalSignal?: AbortSignal,
): Promise<JudgeEnvelope> {
  const form = new FormData();
  if (input.primaryFile) form.append("prd", input.primaryFile);
  if (input.pastedText?.trim()) form.append("prd_text", input.pastedText.trim());
  input.supportingFiles.forEach((file) => form.append("supporting_files", file));

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);
  const abort = () => controller.abort(externalSignal?.reason || "cancelled");
  externalSignal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`${API_BASE}/api/prd-judge/evaluate`, {
      method: "POST",
      body: form,
      signal: controller.signal,
      headers: { Accept: "text/event-stream" },
    });
    if (!response.ok || !response.body) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || `Evaluation request failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: JudgeEnvelope | null = null;
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const parsed = parseSseBlock(block);
        if (!parsed) continue;
        if (parsed.event === "progress") onProgress(parsed.data as ProgressUpdate);
        if (parsed.event === "complete") result = parsed.data as JudgeEnvelope;
        if (parsed.event === "error") {
          const error = parsed.data as { message?: string };
          throw new Error(error.message || "The evaluation did not return a validated report.");
        }
      }
      if (done) break;
    }
    if (!result) throw new Error("The evaluation stream ended before a validated report was returned.");
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      if (controller.signal.reason === "timeout") {
        throw new Error("The evaluation exceeded the 10-minute safety timeout.");
      }
      throw new EvaluationCancelledError();
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abort);
  }
}
