import { ArrowRight, FileCheck } from "lucide-react";
import { Button } from "./ui/button";

interface HeroProps {
  onEvaluateClick: () => void;
}

export function Hero({ onEvaluateClick }: HeroProps) {
  return (
    <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-8">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <FileCheck className="w-8 h-8 text-primary" />
        </div>

        {/* Headline */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-foreground">
            Ship Faster with AI Agent Ready PRDs
          </h1>
          <h4 className="text-muted-foreground">
            Evaluate your product requirements against 11 critical criteria
            <br />
            Get binary PASS/FAIL scoring, prioritized fix plans, and AI agent-executable tasks
          </h4>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            size="lg"
            className="gap-3 px-12 py-6 text-lg"
            onClick={onEvaluateClick}
          >
            Evaluate Your PRD
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Subtext */}
        <div className="space-y-1">
          <p className="text-muted-foreground">
            Trusted for Pharma/GxP projects
          </p>
          <p className="text-xs text-muted-foreground">
            Your PRDs stay private. We evaluate and delete—no storage, no logs, no traces.
          </p>
        </div>
      </div>
    </section>
  );
}