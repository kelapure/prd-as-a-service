// API client for EvalPRD backend endpoints

import type {
  BinaryScoreOutput,
  FixPlanOutput,
  AgentTasksOutput,
} from "../types/api";

// Use local API during dev, relative path in production (works with App Engine dispatch)
const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "";
const API_TIMEOUT = 300000; // 5 minutes for complex PRD evaluations

interface APIError {
  error: string;
}

/**
 * Call the binary_score endpoint with streaming support
 * @param prdText - The full PRD text content
 * @param onProgress - Callback for progress updates (delta, accumulated full text)
 * @returns Binary score evaluation with pass/fail for each criterion
 */
export async function evaluatePRD(
  prdText: string,
  onProgress?: (delta: string, accumulated: string) => void
): Promise<BinaryScoreOutput> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('[evaluatePRD] Request timed out after 3 minutes');
      reject(new Error("Request timed out after 3 minutes"));
    }, API_TIMEOUT);

    console.log('[evaluatePRD] Starting request, PRD length:', prdText.length);

    fetch(`${API_BASE_URL}/api/evalprd/binary_score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prd_text: prdText }),
    })
      .then(async (response) => {
        console.log('[evaluatePRD] Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body for streaming");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let eventCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[evaluatePRD] Reader done, events received:', eventCount);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              eventCount++;
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "delta") {
                  onProgress?.(data.delta, data.accumulated);
                } else if (data.type === "done") {
                  console.log('[evaluatePRD] Done event received');
                  clearTimeout(timeoutId);
                  resolve(data.result);
                  return;
                } else if (data.type === "error") {
                  console.error('[evaluatePRD] Error event:', data.error);
                  clearTimeout(timeoutId);
                  reject(new Error(data.error));
                  return;
                }
              } catch (e) {
                console.error('[evaluatePRD] Failed to parse SSE line:', line, e);
              }
            }
          }
        }

        console.error('[evaluatePRD] Stream ended without done event, buffer:', buffer);
        clearTimeout(timeoutId);
        reject(new Error("Stream ended without completion"));
      })
      .catch((error) => {
        console.error('[evaluatePRD] Fetch error:', error);
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Call the fix_plan endpoint with streaming support
 * @param prdText - The full PRD text content
 * @param onProgress - Callback for progress updates (delta, accumulated full text)
 * @returns Fix plan with P0/P1/P2 prioritized items
 */
export async function generateFixPlan(
  prdText: string,
  onProgress?: (delta: string, accumulated: string) => void
): Promise<FixPlanOutput> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('[generateFixPlan] Request timed out after 3 minutes');
      reject(new Error("Request timed out after 3 minutes"));
    }, API_TIMEOUT);

    console.log('[generateFixPlan] Starting request, PRD length:', prdText.length);

    fetch(`${API_BASE_URL}/api/evalprd/fix_plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prd_text: prdText }),
    })
      .then(async (response) => {
        console.log('[generateFixPlan] Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body for streaming");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let eventCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[generateFixPlan] Reader done, events received:', eventCount);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              eventCount++;
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "delta") {
                  onProgress?.(data.delta, data.accumulated);
                } else if (data.type === "done") {
                  console.log('[generateFixPlan] Done event received');
                  clearTimeout(timeoutId);
                  resolve(data.result);
                  return;
                } else if (data.type === "error") {
                  console.error('[generateFixPlan] Error event:', data.error);
                  clearTimeout(timeoutId);
                  reject(new Error(data.error));
                  return;
                }
              } catch (e) {
                console.error('[generateFixPlan] Failed to parse SSE line:', line, e);
              }
            }
          }
        }

        console.error('[generateFixPlan] Stream ended without done event, buffer:', buffer);
        clearTimeout(timeoutId);
        reject(new Error("Stream ended without completion"));
      })
      .catch((error) => {
        console.error('[generateFixPlan] Fetch error:', error);
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Call the agent_tasks endpoint with streaming support
 * @param prdText - The full PRD text content
 * @param onProgress - Callback for progress updates (delta, accumulated full text)
 * @returns Agent tasks with dependencies and DAG structure
 */
export async function generateAgentTasks(
  prdText: string,
  onProgress?: (delta: string, accumulated: string) => void
): Promise<AgentTasksOutput> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('[generateAgentTasks] Request timed out after 3 minutes');
      reject(new Error("Request timed out after 3 minutes"));
    }, API_TIMEOUT);

    console.log('[generateAgentTasks] Starting request, PRD length:', prdText.length);

    fetch(`${API_BASE_URL}/api/evalprd/agent_tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prd_text: prdText }),
    })
      .then(async (response) => {
        console.log('[generateAgentTasks] Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body for streaming");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let eventCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[generateAgentTasks] Reader done, events received:', eventCount);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              eventCount++;
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "delta") {
                  onProgress?.(data.delta, data.accumulated);
                } else if (data.type === "done") {
                  console.log('[generateAgentTasks] Done event received');
                  clearTimeout(timeoutId);
                  resolve(data.result);
                  return;
                } else if (data.type === "error") {
                  console.error('[generateAgentTasks] Error event:', data.error);
                  clearTimeout(timeoutId);
                  reject(new Error(data.error));
                  return;
                }
              } catch (e) {
                console.error('[generateAgentTasks] Failed to parse SSE line:', line, e);
              }
            }
          }
        }

        console.error('[generateAgentTasks] Stream ended without done event, buffer:', buffer);
        clearTimeout(timeoutId);
        reject(new Error("Stream ended without completion"));
      })
      .catch((error) => {
        console.error('[generateAgentTasks] Fetch error:', error);
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Call all three endpoints sequentially and return combined results with streaming support
 * @param prdText - The full PRD text content
 * @param onProgress - Optional callback for progress updates (step, progressPercent, accumulatedLength)
 * @returns Combined evaluation results
 */
export async function evaluatePRDComplete(
  prdText: string,
  onProgress?: (step: string, progress: number, accumulatedLength?: number) => void
): Promise<{
  binaryScore: BinaryScoreOutput;
  fixPlan: FixPlanOutput;
  agentTasks: AgentTasksOutput;
}> {
  // Step 1: Binary Score (33% progress)
  onProgress?.("Evaluating PRD against 11 criteria...", 0);
  const binaryScore = await evaluatePRD(prdText, (delta, accumulated) => {
    const progress = Math.min((accumulated / 5000) * 33, 33);
    onProgress?.("Evaluating PRD against 11 criteria...", progress, accumulated);
  });
  onProgress?.("Binary evaluation complete", 33);

  // Step 2: Fix Plan (66% progress)
  onProgress?.("Generating prioritized fix plan...", 33);
  const fixPlan = await generateFixPlan(prdText, (delta, accumulated) => {
    const progress = 33 + Math.min((accumulated / 3000) * 33, 33);
    onProgress?.("Generating prioritized fix plan...", progress, accumulated);
  });
  onProgress?.("Fix plan complete", 66);

  // Step 3: Agent Tasks (100% progress)
  onProgress?.("Creating executable task breakdown...", 66);
  const agentTasks = await generateAgentTasks(prdText, (delta, accumulated) => {
    const progress = 66 + Math.min((accumulated / 3000) * 34, 34);
    onProgress?.("Creating executable task breakdown...", progress, accumulated);
  });
  onProgress?.("All evaluations complete", 100);

  return { binaryScore, fixPlan, agentTasks };
}
