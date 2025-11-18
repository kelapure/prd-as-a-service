import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import type { BinaryScoreOutput } from "../types/api";
import binaryScoreImg from "../assets/binary-score.png";

interface HeroBinaryScoreCardProps {
  data: BinaryScoreOutput | null;
  isLoading?: boolean;
}

export function HeroBinaryScoreCard({ data, isLoading }: HeroBinaryScoreCardProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full flex flex-col shadow-[var(--elevation-sm)] hover:shadow-[var(--elevation-md)] transition-shadow duration-300 bg-card border border-border rounded-[var(--radius-card)] overflow-hidden">
        <div className="w-full h-full flex items-center justify-center p-0">
          <img 
            src={binaryScoreImg} 
            alt="Binary Score Example" 
            className="w-full h-full object-contain"
          />
        </div>
      </Card>
    );
  }

  const passCount = data.pass_count || 0;
  const totalCount = data.criteria?.length || 11;
  const readinessGate = data.readiness_gate?.state || "HOLD";
  
  // Get top 3 criteria: first PASS, then first 2 FAILs
  const passCriteria = data.criteria.filter(c => c.status === "pass");
  const failCriteria = data.criteria.filter(c => c.status === "fail");
  const topCriteria = [
    ...passCriteria.slice(0, 1),
    ...failCriteria.slice(0, 2)
  ].slice(0, 3);

  const handleClick = () => {
    // Ensure results section is visible, then scroll to binary score
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        document.getElementById('binary-score')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } else {
      // If results section doesn't exist yet, scroll to top (user needs to upload first)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-[var(--elevation-sm)] hover:shadow-[var(--elevation-md)] transition-shadow duration-300 bg-card border border-border rounded-[var(--radius-card)]">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="space-y-3">
          <CardTitle className="text-base font-semibold text-card-foreground">
            Binary Score
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {passCount}/{totalCount} PASS
            </span>
            <Badge 
              variant={readinessGate === "GO" ? "secondary" : "destructive"}
              className={readinessGate === "GO" ? "bg-chart-2/10 text-chart-2 border-chart-2/20" : ""}
            >
              {readinessGate}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-6 pb-4 space-y-4">
        {/* Stats */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            {passCount}/{totalCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Criteria passed
          </p>
        </div>

        {/* Top Criteria */}
        <div className="space-y-3">
          {topCriteria.map((criterion) => (
            <div key={criterion.id} className="flex items-start gap-3">
              {criterion.status === "pass" ? (
                <CheckCircle2 className="w-4 h-4 text-chart-2 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground">
                    {criterion.id}: {criterion.name}
                  </p>
                  <Badge 
                    variant={criterion.status === "pass" ? "secondary" : "outline"}
                    className={
                      criterion.status === "pass" 
                        ? "bg-chart-2/15 text-chart-2 border-chart-2/30 text-xs" 
                        : "bg-destructive/5 border-destructive/30 text-destructive text-xs"
                    }
                  >
                    {criterion.status === "pass" ? "PASS" : "FAIL"}
                  </Badge>
                </div>
                {criterion.evidence && criterion.evidence.length > 0 && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    "{criterion.evidence[0].quote}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Link */}
        <div className="pt-2 border-t border-border/30 mt-4">
          <button
            onClick={handleClick}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            View full evaluation <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

