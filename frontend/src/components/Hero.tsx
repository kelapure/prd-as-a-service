import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "./ui/button";
import { VideoModal } from "./VideoModal";
import { DialogTrigger } from "./ui/dialog";
import { useState, useEffect } from "react";
import { HeroBinaryScoreCard } from "./HeroBinaryScoreCard";
import { HeroFixPlanCard } from "./HeroFixPlanCard";
import { HeroAgentTasksCard } from "./HeroAgentTasksCard";
import { loadSpotifyData } from "../lib/spotifyData";
import type { BinaryScoreOutput, FixPlanOutput, AgentTasksOutput } from "../types/api";

interface HeroProps {
  onEvaluateClick: () => void;
}

export function Hero({ onEvaluateClick }: HeroProps) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [spotifyBinaryScore, setSpotifyBinaryScore] = useState<BinaryScoreOutput | null>(null);
  const [spotifyFixPlan, setSpotifyFixPlan] = useState<FixPlanOutput | null>(null);
  const [spotifyAgentTasks, setSpotifyAgentTasks] = useState<AgentTasksOutput | null>(null);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(true);

  useEffect(() => {
    loadSpotifyData()
      .then((data) => {
        setSpotifyBinaryScore(data.binaryScore);
        setSpotifyFixPlan(data.fixPlan);
        setSpotifyAgentTasks(data.agentTasks);
        setIsLoadingSpotify(false);
      })
      .catch((error) => {
        console.error('Failed to load Spotify data:', error);
        setIsLoadingSpotify(false);
      });
  }, []);

  return (
    <section className="px-6 py-20 max-w-6xl mx-auto grid-background">
      <div className="space-y-8 md:space-y-12">
        {/* Hero Content with Image */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          {/* Left: Text + CTA */}
          <div className="space-y-6 md:space-y-8 text-center md:text-left">
            {/* Headline */}
            <div className="space-y-4 md:space-y-6">
              <h1 className="text-foreground leading-tight">
                Ship Faster with <span className="text-primary">AI Agent Ready</span> PRDs
              </h1>
              <h4 className="text-muted-foreground leading-relaxed">
                Evaluate your product requirements against <span className="text-foreground font-semibold">11 criteria</span>
                <br />
                Get binary PASS/FAIL scoring, prioritized fix plans, and AI agent-executable tasks
              </h4>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center md:justify-start pt-2">
              <Button
                size="lg"
                className="gap-3 px-12 py-6 text-lg"
                onClick={onEvaluateClick}
              >
                Evaluate Your PRD
                <ArrowRight className="w-5 h-5" />
              </Button>

              <VideoModal open={videoOpen} onOpenChange={setVideoOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-3 px-12 py-6 text-lg border-primary text-primary hover:bg-primary/10"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Watch Demo
                  </Button>
                </DialogTrigger>
              </VideoModal>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="order-first md:order-last flex justify-center md:justify-end items-start">
            <img
              src="/hero-image.jpeg"
              alt="AI-powered PRD evaluation workflow"
              className="rounded-[var(--radius-card)] shadow-lg border border-border/50 w-full max-w-xl md:max-w-2xl"
            />
          </div>
        </div>

        {/* Three Column Evaluation Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-16 md:mt-24 lg:mt-32">
          <HeroBinaryScoreCard data={spotifyBinaryScore} isLoading={isLoadingSpotify} />
          <HeroFixPlanCard data={spotifyFixPlan} isLoading={isLoadingSpotify} />
          <HeroAgentTasksCard data={spotifyAgentTasks} isLoading={isLoadingSpotify} />
        </div>

        {/* Trust Indicators */}
        <div className="space-y-2 md:space-y-3 text-center mt-8">
          <p className="text-sm font-medium text-foreground">
            Trusted for Pharma/GxP projects
          </p>
          <p className="text-xs text-muted-foreground">
            🔒 Your PRDs stay private. We evaluate and delete—no storage, no logs, no traces.
          </p>
        </div>
      </div>
    </section>
  );
}
