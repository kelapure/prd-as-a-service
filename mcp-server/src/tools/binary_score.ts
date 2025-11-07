// Binary Score Tool - PASS/FAIL evaluation with readiness gate

import { BinaryScoreInput, BinaryScoreOutput } from "../lib/schemas.js";
import { callStructured } from "../lib/openai.js";
import { validateOutput } from "../lib/validation.js";
import { buildUserBlock } from "../lib/util.js";
import { EXACT_SYSTEM_PROMPT, APPEND_BINARY } from "../lib/prompts.js";
import type { BinaryScoreInput as BinaryScoreInputType } from "../types.js";

export default {
  name: "binary_score",
  description: "Evaluate PRD against 11 criteria with PASS/FAIL scoring, evidence, compliance gaps, readiness gate, and optional inter-evaluator agreement stats.",
  inputSchema: BinaryScoreInput,

  handler: async (args: BinaryScoreInputType) => {
    const evidenceCount = args.evidence_per_criterion ?? 1;
    const system = `${EXACT_SYSTEM_PROMPT}\n\n${APPEND_BINARY(evidenceCount)}`;
    const user = buildUserBlock(args);

    const json = await callStructured({
      model: process.env.EVALPRD_MODEL || "gpt-4o",
      system,
      user,
      outputSchema: BinaryScoreOutput,
      temperature: 1
    });

    validateOutput(BinaryScoreOutput, json);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(json, null, 2)
      }]
    };
  }
};
