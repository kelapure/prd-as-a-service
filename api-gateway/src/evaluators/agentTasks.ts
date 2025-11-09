// Agent Tasks Evaluator - 2-4h executable tasks with DAG dependencies

import { AgentTasksInput, AgentTasksOutput } from "../lib/schemas.js";
import { callStructuredStream } from "../lib/openai.js";
import { validateOutput } from "../lib/validation.js";
import { buildUserBlock } from "../lib/util.js";
import { EXACT_SYSTEM_PROMPT, APPEND_AGENT_TASKS } from "../lib/prompts.js";
import type { AgentTasksInput as AgentTasksInputType, AgentTasksOutput as AgentTasksOutputType } from "../types.js";

export async function evaluateAgentTasks(
  args: AgentTasksInputType,
  onProgress?: (delta: string, accumulated: string) => void
): Promise<AgentTasksOutputType> {
  const minHours = args.task_hours_min ?? 2;
  const maxHours = args.task_hours_max ?? 4;
  const emitMermaid = args.emit_mermaid ?? false;

  const system = `${EXACT_SYSTEM_PROMPT}\n\n${APPEND_AGENT_TASKS(minHours, maxHours, emitMermaid)}`;
  const user = buildUserBlock(args);

  const json = await callStructuredStream({
    model: process.env.EVALPRD_MODEL || "gpt-5",
    system,
    user,
    outputSchema: AgentTasksOutput,
    temperature: 0.3,
    onProgress
  });

  validateOutput(AgentTasksOutput, json);

  return json;
}
