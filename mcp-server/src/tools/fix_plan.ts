// Fix Plan Tool - Prioritized improvement plan with P0/P1/P2 priorities

import { FixPlanInput, FixPlanOutput } from "../lib/schemas.js";
import { callStructured } from "../lib/openai.js";
import { validateOutput } from "../lib/validation.js";
import { buildUserBlock } from "../lib/util.js";
import { EXACT_SYSTEM_PROMPT, APPEND_FIX_PLAN } from "../lib/prompts.js";
import type { FixPlanInput as FixPlanInputType } from "../types.js";

export default {
  name: "fix_plan",
  description: "Generate prioritized fix plan with P0/P1/P2 priorities, owners, effort estimates, and acceptance tests for PRD improvements.",
  inputSchema: FixPlanInput,

  handler: async (args: FixPlanInputType) => {
    const limit = args.limit ?? 10;
    const timeHorizonDays = args.time_horizon_days ?? 10;
    const includeTests = args.include_acceptance_tests ?? true;

    const system = `${EXACT_SYSTEM_PROMPT}\n\n${APPEND_FIX_PLAN(limit, timeHorizonDays, includeTests)}`;
    const user = buildUserBlock(args);

    const json = await callStructured({
      model: process.env.EVALPRD_MODEL || "gpt-4o",
      system,
      user,
      outputSchema: FixPlanOutput,
      temperature: 1
    });

    validateOutput(FixPlanOutput, json);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(json, null, 2)
      }]
    };
  }
};
