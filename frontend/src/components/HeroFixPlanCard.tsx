import { AlertCircle, ArrowRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import type { FixPlanOutput } from "../types/api";
import fixPlanImg from "../assets/fix-plan.png";

interface HeroFixPlanCardProps {
  data: FixPlanOutput | null;
  isLoading?: boolean;
}

const priorityColors: Record<string, string> = {
  P0: "bg-destructive/10 text-destructive border-destructive/20",
  P1: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  P2: "bg-muted text-muted-foreground border-border"
};

export function HeroFixPlanCard({ data, isLoading }: HeroFixPlanCardProps) {
  // Always show placeholder image in hero section
  if (isLoading || !data) {
    return (
      <div className="h-full w-full overflow-hidden rounded-[var(--radius-card)] shadow-[var(--elevation-sm)]">
        <img 
          src={fixPlanImg} 
          alt="Fix Plan Example" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const items = data.items || [];
  const p0Items = items.filter(item => item.priority === "P0");
  const p1Items = items.filter(item => item.priority === "P1");
  const p2Items = items.filter(item => item.priority === "P2");
  const topP0Items = p0Items.slice(0, 3);

  const handleClick = () => {
    // Ensure results section is visible, then scroll to fix plan
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        document.getElementById('fix-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            Fix Plan
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {items.length} items
            </span>
            {p0Items.length > 0 && (
              <Badge variant="outline" className={priorityColors.P0 + " text-xs"}>
                {p0Items.length} P0
              </Badge>
            )}
            {p1Items.length > 0 && (
              <Badge variant="outline" className={priorityColors.P1 + " text-xs"}>
                {p1Items.length} P1
              </Badge>
            )}
            {p2Items.length > 0 && (
              <Badge variant="outline" className={priorityColors.P2 + " text-xs"}>
                {p2Items.length} P2
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-6 pb-4 space-y-4">
        {/* Stats */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            {items.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Prioritized fixes
          </p>
        </div>

        {/* Top P0 Items */}
        <div className="space-y-3">
          {topP0Items.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={priorityColors[item.priority] + " text-xs"}>
                  {item.priority}
                </Badge>
                {item.blocking && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Blocking
                  </Badge>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground">
                Owner: {item.owner}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Link */}
        <div className="pt-2 border-t border-border/30 mt-4">
          <button
            onClick={handleClick}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            View full fix plan <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

