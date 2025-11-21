// Home page - main landing page with evaluation functionality

import { useState } from "react";
import { Hero } from "../components/Hero";
import { ExampleOutput } from "../components/ExampleOutput";
import { FixPlanExample } from "../components/FixPlanExample";
import { AgentTasksExample } from "../components/AgentTasksExample";
import { CTASection } from "../components/CTASection";
import { UploadDialog } from "../components/UploadDialog";
import { evaluatePRD, generateFixPlan, generateAgentTasks } from "../lib/api";
import type { BinaryScoreOutput, FixPlanOutput, AgentTasksOutput } from "../types/api";

export function HomePage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [binaryScoreData, setBinaryScoreData] = useState<BinaryScoreOutput | null>(null);
  const [fixPlanData, setFixPlanData] = useState<FixPlanOutput | null>(null);
  const [agentTasksData, setAgentTasksData] = useState<AgentTasksOutput | null>(null);
  const [isLoadingBinaryScore, setIsLoadingBinaryScore] = useState(false);
  const [isLoadingFixPlan, setIsLoadingFixPlan] = useState(false);
  const [isLoadingAgentTasks, setIsLoadingAgentTasks] = useState(false);
  const [prdText, setPrdText] = useState<string>("");

  const handleUploadComplete = async (uploadedPrdText: string) => {
    // Store PRD text for later use in payment flow
    setPrdText(uploadedPrdText);

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
      evaluatePRD(uploadedPrdText)
        .then((data) => setBinaryScoreData(data))
        .catch((error) => console.error('Binary score generation failed:', error))
        .finally(() => setIsLoadingBinaryScore(false)),

      generateFixPlan(uploadedPrdText)
        .then((data) => setFixPlanData(data))
        .catch((error) => console.error('Fix plan generation failed:', error))
        .finally(() => setIsLoadingFixPlan(false)),

      generateAgentTasks(uploadedPrdText)
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
          <ExampleOutput 
            data={binaryScoreData} 
            isLoading={isLoadingBinaryScore}
            prdText={prdText}
          />
          <FixPlanExample 
            data={fixPlanData} 
            isLoading={isLoadingFixPlan}
            prdText={prdText}
          />
          <AgentTasksExample 
            data={agentTasksData} 
            isLoading={isLoadingAgentTasks}
            prdText={prdText}
          />
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

