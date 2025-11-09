// Fix Plan Evaluator - Prioritized improvement plan with P0/P1/P2 priorities

import { FixPlanInput, FixPlanOutput } from "../lib/schemas.js";
import { callStructuredStream } from "../lib/openai.js";
import { validateOutput } from "../lib/validation.js";
import { buildUserBlock } from "../lib/util.js";
import { EXACT_SYSTEM_PROMPT, APPEND_FIX_PLAN } from "../lib/prompts.js";
import type { FixPlanInput as FixPlanInputType, FixPlanOutput as FixPlanOutputType } from "../types.js";

export async function evaluateFixPlan(
  args: FixPlanInputType,
  onProgress?: (delta: string, accumulated: string) => void
): Promise<FixPlanOutputType> {
  const limit = args.limit ?? 10;
  const timeHorizonDays = args.time_horizon_days ?? 10;
  const includeTests = args.include_acceptance_tests ?? true;

  const system = `${EXACT_SYSTEM_PROMPT}\n\n${APPEND_FIX_PLAN(limit, timeHorizonDays, includeTests)}`;
  const user = buildUserBlock(args);

  const json = await callStructuredStream({
    model: process.env.EVALPRD_MODEL || "gpt-5",
    system,
    user,
    outputSchema: FixPlanOutput,
    temperature: 0.3,
    onProgress
  });

  validateOutput(FixPlanOutput, json);

  return json;
}
