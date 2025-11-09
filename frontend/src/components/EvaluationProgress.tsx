// Progress indicator for streaming PRD evaluation

import { Progress } from "./ui/progress";

interface EvaluationProgressProps {
  stage: "binary_score" | "fix_plan" | "agent_tasks" | "complete";
  progress: number; // 0-100
  accumulatedLength?: number; // Characters accumulated
}

export function EvaluationProgress({ 
  stage, 
  progress, 
  accumulatedLength 
}: EvaluationProgressProps) {
  const stageLabels = {
    binary_score: "Evaluating against 11 criteria...",
    fix_plan: "Generating prioritized fix plan...",
    agent_tasks: "Creating executable task breakdown...",
    complete: "Evaluation complete!"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {stageLabels[stage]}
        </span>
        {accumulatedLength !== undefined && stage !== "complete" && (
          <span className="text-xs text-muted-foreground font-mono">
            {accumulatedLength} chars
          </span>
        )}
      </div>

      <Progress value={progress} className="h-2" />

      {stage === "complete" && (
        <p className="text-sm text-muted-foreground">
          Your PRD has been evaluated successfully!
        </p>
      )}
    </div>
  );
}

