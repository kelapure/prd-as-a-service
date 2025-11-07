import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, TrendingUp, FileText, Loader2, Download, ChevronDown, ChevronUp, ListOrdered, CheckSquare } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useState } from "react";
import { exportFixPlanAsMarkdown, downloadMarkdownFile } from "../lib/exportMarkdown";
import type { FixPlanOutput } from "../types/api";

const priorityColors: Record<string, string> = {
  P0: "bg-destructive/10 text-destructive border-destructive/20",
  P1: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  P2: "bg-muted text-muted-foreground border-border"
};

const effortLabels: Record<string, string> = {
  S: "Small",
  M: "Medium",
  L: "Large"
};

interface FixPlanExampleProps {
  data: FixPlanOutput | null;
  isLoading?: boolean;
}

// Individual fix plan item component with collapsible details
function FixPlanItem({ item }: { item: FixPlanOutput['items'][0] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--elevation-sm)] overflow-hidden hover:shadow-md transition-shadow">
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-6">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={priorityColors[item.priority]}>
                    {item.priority}
                  </Badge>
                  {item.blocking && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Blocking
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Effort: {effortLabels[item.effort]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Impact: {item.impact}
                  </span>
                  {item.linked_criteria && item.linked_criteria.length > 0 && (
                    <div className="flex gap-1">
                      {item.linked_criteria.map((cId) => (
                        <Badge key={cId} variant="outline" className="text-xs">
                          {cId}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <h4 className="text-foreground text-left font-semibold">{item.title}</h4>
                <p className="text-sm text-muted-foreground text-left leading-relaxed">
                  {item.description}
                </p>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4 border-t border-border bg-muted/30 text-left">
            {/* Implementation Steps */}
            {item.steps && item.steps.length > 0 && (
              <div className="pt-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">
                  <ListOrdered className="w-4 h-4" />
                  Implementation Steps
                </div>
                <ol className="space-y-1 ml-6 text-left list-decimal">
                  {item.steps.map((step, idx) => (
                    <li key={idx} className="text-sm text-foreground text-left pl-2">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Acceptance Tests */}
            {item.acceptance_tests && item.acceptance_tests.length > 0 && (
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">
                  <CheckSquare className="w-4 h-4" />
                  Acceptance Tests
                </div>
                <ul className="space-y-1 ml-6 text-left">
                  {item.acceptance_tests.map((test, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground text-left">
                      <span className="text-chart-2 flex-shrink-0 mt-0.5">✓</span>
                      <span className="text-left">{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function FixPlanExample({ data, isLoading }: FixPlanExampleProps) {
  const items = data?.items || [];
  const p0Count = items.filter(item => item.priority === "P0").length;
  const p1Count = items.filter(item => item.priority === "P1").length;
  const p2Count = items.filter(item => item.priority === "P2").length;

  const handleExport = () => {
    if (!data) return;
    const markdown = exportFixPlanAsMarkdown(data);
    downloadMarkdownFile(markdown, 'prd-fix-plan.md');
  };

  return (
    <section className="px-6 py-20 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-8">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <h2 className="text-foreground">Fix Plan</h2>
            <p className="text-muted-foreground">
              Concrete action items organized by priority with effort estimates
            </p>
          </div>

          {/* Fix Items */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="bg-card rounded-[var(--radius-card)] border border-border p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-foreground font-medium">Generating fix plan...</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Analyzing failed criteria and prioritizing improvements (1-2 minutes)
                </p>
              </div>
            ) : items.length > 0 ? (
              items.map((item) => <FixPlanItem key={item.id} item={item} />)
            ) : (
              <div className="bg-card rounded-[var(--radius-card)] border border-border p-12 text-center">
                <p className="text-muted-foreground">
                  Upload a PRD to see prioritized fix recommendations
                </p>
              </div>
            )}
          </div>

          {/* Summary Card */}
          {items.length > 0 && (
            <div className="bg-muted/30 rounded-[var(--radius-card)] p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-foreground mb-2">Path to "Go" Status</h4>
                  <p className="text-muted-foreground">
                    {p0Count > 0 ? (
                      <>Close all {p0Count} P0 items to move toward GO status. </>
                    ) : (
                      <>No blocking P0 items. </>
                    )}
                    {p1Count > 0 && (
                      <>{p1Count} P1 item{p1Count > 1 ? 's' : ''} will improve implementation quality. </>
                    )}
                    {p2Count > 0 && (
                      <>{p2Count} P2 item{p2Count > 1 ? 's' : ''} can be deferred.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          {data && items.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export Fix Plan
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}