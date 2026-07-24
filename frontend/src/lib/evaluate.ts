import type { JudgeEnvelope, ProgressUpdate } from "../types/judge";
import type { AccessFailure, AccessFailureCode, AccessQuota } from "../types/access";
import { API_BASE } from "./api";


export class EvaluationCancelledError extends Error {
  constructor() {
    super("Evaluation cancelled. Your document was not saved.");
    this.name = "EvaluationCancelledError";
  }
}

export class EvaluationApiError extends Error {
  readonly code?: AccessFailureCode | string;
  readonly status: number;
  readonly retryAfterSeconds?: number;
  readonly quota?: AccessQuota;

  constructor(
    message: string,
    options: {
      code?: AccessFailureCode | string;
      status: number;
      retryAfterSeconds?: number;
      quota?: AccessQuota;
    },
  ) {
    super(message);
    this.name = "EvaluationApiError";
    this.code = options.code;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.quota = options.quota;
  }
}

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

export function asJudgeEnvelope(payload: unknown): JudgeEnvelope {
  const envelope = payload as Partial<JudgeEnvelope> | null;
  if (!envelope || envelope.schema_version !== "evalgpt-prd-judge/v2") {
    throw new Error(
      "The evaluation service returned a report version this page does not support. Reload the page to get the current version, then evaluate again.",
    );
  }
  const scoreStatus = envelope?.prd_score?.status;
  const scoreReport = envelope?.prd_score?.report;
  if (
    (scoreStatus !== "complete" && scoreStatus !== "not_scored")
    || !scoreReport
    || (scoreStatus === "complete"
      && (scoreReport.status !== "scored" || !scoreReport.totals))
    || (scoreStatus === "not_scored"
      && (scoreReport.status !== "not_scored" || scoreReport.totals !== null))
  ) {
    throw new Error(
      "The evaluation service did not return the complete Judge and PRD Score report this page requires. Reload the page, then evaluate again.",
    );
  }
  return envelope as JudgeEnvelope;
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
  googleIdToken?: string,
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
      headers: {
        Accept: "text/event-stream",
        ...(googleIdToken ? { Authorization: `Bearer ${googleIdToken}` } : {}),
      },
    });
    if (!response.ok || !response.body) {
      const payload = (await response.json().catch(() => ({}))) as AccessFailure;
      const retryAfter = Number(response.headers.get("Retry-After"));
      throw new EvaluationApiError(
        payload.error || `Evaluation request failed with HTTP ${response.status}`,
        {
          code: payload.code,
          status: response.status,
          retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
          quota: payload.quota,
        },
      );
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
        if (parsed.event === "complete") result = asJudgeEnvelope(parsed.data);
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
