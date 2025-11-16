import { Hero } from "./components/Hero";
import { ExampleOutput } from "./components/ExampleOutput";
import { FixPlanExample } from "./components/FixPlanExample";
import { AgentTasksExample } from "./components/AgentTasksExample";
import { CTASection } from "./components/CTASection";
import { UploadDialog } from "./components/UploadDialog";
import { useState } from "react";
import { evaluatePRD, generateFixPlan, generateAgentTasks } from "./lib/api";
import type { BinaryScoreOutput, FixPlanOutput, AgentTasksOutput } from "./types/api";

export default function App() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [binaryScoreData, setBinaryScoreData] = useState<BinaryScoreOutput | null>(null);
  const [fixPlanData, setFixPlanData] = useState<FixPlanOutput | null>(null);
  const [agentTasksData, setAgentTasksData] = useState<AgentTasksOutput | null>(null);
  const [isLoadingBinaryScore, setIsLoadingBinaryScore] = useState(false);
  const [isLoadingFixPlan, setIsLoadingFixPlan] = useState(false);
  const [isLoadingAgentTasks, setIsLoadingAgentTasks] = useState(false);

  const handleUploadComplete = async (prdText: string) => {
    // Show results section immediately with all three loading
    setShowResults(true);
    setIsLoadingBinaryScore(true);
    setIsLoadingFixPlan(true);
    setIsLoadingAgentTasks(true);

    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Run all three evaluations in parallel
    await Promise.allSettled([
      evaluatePRD(prdText)
        .then((data) => setBinaryScoreData(data))
        .catch((error) => console.error('Binary score generation failed:', error))
        .finally(() => setIsLoadingBinaryScore(false)),

      generateFixPlan(prdText)
        .then((data) => setFixPlanData(data))
        .catch((error) => console.error('Fix plan generation failed:', error))
        .finally(() => setIsLoadingFixPlan(false)),

      generateAgentTasks(prdText)
        .then((data) => {
          console.log('Agent Tasks Data Received:', data);
          console.log('Number of tasks:', data.tasks?.length);
          setAgentTasksData(data);
        })
        .catch((error) => console.error('Agent tasks generation failed:', error))
        .finally(() => setIsLoadingAgentTasks(false))
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero onEvaluateClick={() => setUploadDialogOpen(true)} />
      
      {showResults && (
        <div id="results">
          <ExampleOutput data={binaryScoreData} isLoading={isLoadingBinaryScore} />
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