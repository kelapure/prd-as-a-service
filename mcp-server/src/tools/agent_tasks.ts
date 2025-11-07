// Agent Tasks Tool - 2-4h executable tasks with DAG dependencies

import { AgentTasksInput, AgentTasksOutput } from "../lib/schemas.js";
import { callStructured } from "../lib/openai.js";
import { validateOutput } from "../lib/validation.js";
import { buildUserBlock } from "../lib/util.js";
import { EXACT_SYSTEM_PROMPT, APPEND_AGENT_TASKS } from "../lib/prompts.js";
import type { AgentTasksInput as AgentTasksInputType } from "../types.js";

export default {
  name: "agent_tasks",
  description: "Decompose PRD into 2-4 hour executable tasks with inputs, outputs, entry/exit conditions, tests, and DAG dependencies for AI agents.",
  inputSchema: AgentTasksInput,

  handler: async (args: AgentTasksInputType) => {
    const minHours = args.task_hours_min ?? 2;
    const maxHours = args.task_hours_max ?? 4;
    const emitMermaid = args.emit_mermaid ?? false;

    const system = `${EXACT_SYSTEM_PROMPT}\n\n${APPEND_AGENT_TASKS(minHours, maxHours, emitMermaid)}`;
    const user = buildUserBlock(args);

    const json = await callStructured({
      model: process.env.EVALPRD_MODEL || "gpt-4o",
      system,
      user,
      outputSchema: AgentTasksOutput,
      temperature: 1
    });

    validateOutput(AgentTasksOutput, json);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(json, null, 2)
      }]
    };
  }
};
