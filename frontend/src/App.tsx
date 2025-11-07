import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { ExampleOutput } from "./components/ExampleOutput";
import { FixPlanExample } from "./components/FixPlanExample";
import { AgentTasksExample } from "./components/AgentTasksExample";
import { CTASection } from "./components/CTASection";
import { UploadDialog } from "./components/UploadDialog";
import { useState } from "react";
import { generateFixPlan, generateAgentTasks } from "./lib/api";
import type { BinaryScoreOutput, FixPlanOutput, AgentTasksOutput } from "./types/api";

export default function App() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [binaryScoreData, setBinaryScoreData] = useState<BinaryScoreOutput | null>(null);
  const [fixPlanData, setFixPlanData] = useState<FixPlanOutput | null>(null);
  const [agentTasksData, setAgentTasksData] = useState<AgentTasksOutput | null>(null);
  const [isLoadingFixPlan, setIsLoadingFixPlan] = useState(false);
  const [isLoadingAgentTasks, setIsLoadingAgentTasks] = useState(false);

  const handleUploadComplete = async (results: {
    binaryScore: BinaryScoreOutput;
    prdText: string;
  }) => {
    // Store binary score immediately
    setBinaryScoreData(results.binaryScore);

    // Show results section
    setShowResults(true);

    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Run fix_plan and agent_tasks in parallel in the background
    setIsLoadingFixPlan(true);
    setIsLoadingAgentTasks(true);

    await Promise.allSettled([
      generateFixPlan(results.prdText)
        .then((data) => setFixPlanData(data))
        .catch((error) => console.error('Fix plan generation failed:', error))
        .finally(() => setIsLoadingFixPlan(false)),

      generateAgentTasks(results.prdText)
        .then((data) => setAgentTasksData(data))
        .catch((error) => console.error('Agent tasks generation failed:', error))
        .finally(() => setIsLoadingAgentTasks(false))
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero onEvaluateClick={() => setUploadDialogOpen(true)} />
      <Features />
      
      {showResults && (
        <div id="results">
          <ExampleOutput data={binaryScoreData} />
          <FixPlanExample data={fixPlanData} isLoading={isLoadingFixPlan} />
          <AgentTasksExample data={agentTasksData} isLoading={isLoadingAgentTasks} />
        </div>
      )}
      
      <CTASection onEvaluateClick={() => setUploadDialogOpen(true)} />
      
      <UploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}