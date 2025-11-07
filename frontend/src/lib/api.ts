// API client for EvalPRD backend endpoints

import type {
  BinaryScoreOutput,
  FixPlanOutput,
  AgentTasksOutput,
} from "../types/api";

const API_BASE_URL = "http://localhost:8080";
const API_TIMEOUT = 180000; // 3 minutes to match backend

interface APIError {
  error: string;
}

/**
 * Call the binary_score endpoint to evaluate PRD against 11 criteria
 * @param prdText - The full PRD text content
 * @returns Binary score evaluation with pass/fail for each criterion
 */
export async function evaluatePRD(
  prdText: string
): Promise<BinaryScoreOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/api/evalprd/binary_score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prd_text: prdText }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: APIError = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data: BinaryScoreOutput = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timed out after 3 minutes. The PRD evaluation is taking longer than expected."
        );
      }
      throw error;
    }
    throw new Error("Unknown error occurred during PRD evaluation");
  }
}

/**
 * Call the fix_plan endpoint to generate prioritized improvement plan
 * @param prdText - The full PRD text content
 * @returns Fix plan with P0/P1/P2 prioritized items
 */
export async function generateFixPlan(
  prdText: string
): Promise<FixPlanOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/api/evalprd/fix_plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prd_text: prdText }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: APIError = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data: FixPlanOutput = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timed out after 3 minutes. Fix plan generation is taking longer than expected."
        );
      }
      throw error;
    }
    throw new Error("Unknown error occurred during fix plan generation");
  }
}

/**
 * Call the agent_tasks endpoint to decompose PRD into executable tasks
 * @param prdText - The full PRD text content
 * @returns Agent tasks with dependencies and DAG structure
 */
export async function generateAgentTasks(
  prdText: string
): Promise<AgentTasksOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/api/evalprd/agent_tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prd_text: prdText }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: APIError = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data: AgentTasksOutput = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timed out after 3 minutes. Task generation is taking longer than expected."
        );
      }
      throw error;
    }
    throw new Error("Unknown error occurred during task generation");
  }
}

/**
 * Call all three endpoints sequentially and return combined results
 * @param prdText - The full PRD text content
 * @param onProgress - Optional callback for progress updates
 * @returns Combined evaluation results
 */
export async function evaluatePRDComplete(
  prdText: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{
  binaryScore: BinaryScoreOutput;
  fixPlan: FixPlanOutput;
  agentTasks: AgentTasksOutput;
}> {
  // Step 1: Binary Score (33% progress)
  onProgress?.("Evaluating PRD against 11 criteria...", 0);
  const binaryScore = await evaluatePRD(prdText);
  onProgress?.("Binary evaluation complete", 33);

  // Step 2: Fix Plan (66% progress)
  onProgress?.("Generating prioritized fix plan...", 33);
  const fixPlan = await generateFixPlan(prdText);
  onProgress?.("Fix plan complete", 66);

  // Step 3: Agent Tasks (100% progress)
  onProgress?.("Creating executable task breakdown...", 66);
  const agentTasks = await generateAgentTasks(prdText);
  onProgress?.("All evaluations complete", 100);

  return { binaryScore, fixPlan, agentTasks };
}
