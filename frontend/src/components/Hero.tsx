import { ArrowRight, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { VideoModal } from "./VideoModal";
import { DialogTrigger } from "./ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useState } from "react";

interface HeroProps {
  onEvaluateClick: () => void;
}

export function Hero({ onEvaluateClick }: HeroProps) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section className="px-6 py-16 md:py-32 max-w-6xl mx-auto grid-background">
      <div className="space-y-16 md:space-y-24">
        {/* Hero Content with Image */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          {/* Left: Text + CTA */}
          <div className="space-y-8 md:space-y-10 text-center md:text-left">
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
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center md:justify-start">
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
          <div className="order-first md:order-last">
            <img
              src="/hero-image.jpeg"
              alt="AI-powered PRD evaluation workflow"
              className="rounded-[var(--radius-card)] shadow-lg border border-border/50 w-full"
            />
          </div>
        </div>

        {/* Example Evaluation Preview Card */}
        <Card className="shadow-lg bg-primary/5 border-2 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4 md:pb-6 border-b border-border/50">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg">Example: Spotify Rewards System PRD</CardTitle>
                <p className="text-muted-foreground text-sm mt-2">
                  <span className="font-semibold text-foreground">2/11 PASS</span> • Readiness Gate: <Badge variant="destructive" className="ml-1">HOLD</Badge>
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 pt-6 md:pt-8 pb-4 md:pb-8">
            {/* C1 PASS */}
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-chart-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">C1: Business Problem Clarity</p>
                  <Badge variant="secondary" className="bg-chart-2/15 text-chart-2 border-chart-2/30 font-semibold">PASS</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  "Users aged 18–24 are dissatisfied… poor song recommendations and excessive ads… low conversion to premium"
                </p>
              </div>
            </div>

            {/* C3 FAIL */}
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">C3: Solution–Problem Alignment</p>
                  <Badge variant="outline" className="bg-destructive/5 border-destructive/30 text-destructive font-semibold">FAIL</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rewards and hyper-local/chatbot partly address discovery but do not reduce ad load—the #1 pain
                </p>
              </div>
            </div>

            {/* C10 FAIL */}
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">C10: Implementability & Eng Readiness</p>
                  <Badge variant="outline" className="bg-destructive/5 border-destructive/30 text-destructive font-semibold">FAIL</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Engineers can't build without API contracts, data schemas, consent flows, or ad-stack changes
                </p>
              </div>
            </div>

            {/* View Full Evaluation Link */}
            <div className="pt-2 border-t border-border/30 mt-4">
              <button
                onClick={onEvaluateClick}
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                Try your own PRD <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="space-y-2 md:space-y-3 text-center">
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
