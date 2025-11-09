// Binary Score Evaluator - PASS/FAIL evaluation with readiness gate

import { BinaryScoreInput, BinaryScoreOutput } from "../lib/schemas.js";
import { callStructuredStream } from "../lib/openai.js";
import { validateOutput } from "../lib/validation.js";
import { buildUserBlock } from "../lib/util.js";
import { EXACT_SYSTEM_PROMPT, APPEND_BINARY } from "../lib/prompts.js";
import type { BinaryScoreInput as BinaryScoreInputType, BinaryScoreOutput as BinaryScoreOutputType } from "../types.js";

export async function evaluateBinaryScore(
  args: BinaryScoreInputType,
  onProgress?: (delta: string, accumulated: string) => void
): Promise<BinaryScoreOutputType> {
  const evidenceCount = args.evidence_per_criterion ?? 1;
  const system = `${EXACT_SYSTEM_PROMPT}\n\n${APPEND_BINARY(evidenceCount)}`;
  const user = buildUserBlock(args);

  const json = await callStructuredStream({
    model: process.env.EVALPRD_MODEL || "gpt-5",
    system,
    user,
    outputSchema: BinaryScoreOutput,
    temperature: 0.2,
    onProgress
  });

  validateOutput(BinaryScoreOutput, json);

  return json;
}
