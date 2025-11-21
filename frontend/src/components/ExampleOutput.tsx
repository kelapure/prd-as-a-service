import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Download, Loader2, Lock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useState } from "react";
import { exportBinaryScoreAsMarkdown, downloadMarkdownFile } from "../lib/exportMarkdown";
import { PaymentDialog } from "./PaymentDialog";
import { useAuth } from "../contexts/AuthContext";
import type { BinaryScoreOutput } from "../types/api";

interface ExampleOutputProps {
  data: BinaryScoreOutput | null;
  isLoading?: boolean;
  prdText?: string;
}

// Individual criterion component with collapsible rationale/evidence
function CriterionItem({ criterion }: { criterion: BinaryScoreOutput['criteria'][0] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-[var(--radius)] border border-border bg-card overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {criterion.status === "pass" ? (
                <CheckCircle2 className="w-5 h-5 text-chart-2 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              )}
              <span className="text-foreground text-left">
                {criterion.id}: {criterion.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={criterion.status === "pass" ? "secondary" : "outline"}
                className={criterion.status === "pass" ? "bg-chart-2/10 text-chart-2 border-chart-2/20" : ""}
              >
                {criterion.status === "pass" ? "PASS" : "FAIL"}
              </Badge>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 py-4 space-y-4 bg-muted/30 border-t border-border">
            {/* Rationale */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rationale</p>
              <p className="text-sm text-foreground leading-relaxed">{criterion.rationale}</p>
            </div>

            {/* Evidence */}
            {criterion.evidence && criterion.evidence.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evidence</p>
                <div className="space-y-3">
                  {criterion.evidence.map((ev, idx) => (
                    <div key={idx} className="pl-4 border-l-2 border-border">
                      <p className="text-sm text-foreground italic leading-relaxed mb-2">"{ev.quote}"</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">Section:</span>
                        <span>{ev.locator.section}</span>
                        {ev.locator.page && (
                          <>
                            <span className="text-border">•</span>
                            <span className="font-medium">Page:</span>
                            <span>{ev.locator.page}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ExampleOutput({ data, isLoading, prdText }: ExampleOutputProps) {
  const { user } = useAuth();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isPaid] = useState(false); // TODO: Track paid status per evaluation

  // Use real data if available, otherwise show placeholder
  const criteria = data?.criteria || [];
  const passCount = data?.pass_count || 0;
  const totalCount = criteria.length || 11;
  const readinessGate = data?.readiness_gate?.state || "HOLD";
  const readinessReason = data?.readiness_gate?.reason || "Evaluating PRD...";
  const prdTitle = data?.prd_title || "Your PRD";

  const handleExport = () => {
    if (!data) return;
    
    // If not paid and has data, show payment dialog
    if (!isPaid && user) {
      setPaymentDialogOpen(true);
      return;
    }

    // If not signed in, prompt to sign in first
    if (!user) {
      setPaymentDialogOpen(true);
      return;
    }

    // User is signed in and paid - allow export
    const markdown = exportBinaryScoreAsMarkdown(data);
    downloadMarkdownFile(markdown, 'prd-binary-score.md');
  };

  // Prepare evaluation data for payment
  const evaluationData = data && prdText ? {
    prdTitle: data.prd_title || "PRD Evaluation",
    prdText,
    binaryScore: data,
    fixPlan: {} as any, // Will be filled by parent
    agentTasks: {} as any // Will be filled by parent
  } : null;

  return (
    <section id="binary-score" className="px-6 py-20 max-w-6xl mx-auto">
      <div className="space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-4">
          <h2 className="text-foreground">Binary Evaluation—No Gray Areas</h2>
          <p className="text-muted-foreground">
            Each criterion receives objective PASS or FAIL with quoted evidence
          </p>
        </div>

        {/* Scorecard Card */}
        <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--elevation-sm)] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-6 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-card-foreground">PRD Readiness Gate</h3>
                <p className="text-muted-foreground mt-1">
                  {prdTitle}
                </p>
              </div>
              <div className="text-right">
                <div className="text-foreground" style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {passCount}/{totalCount}
                </div>
                <Badge
                  variant={readinessGate === "GO" ? "secondary" : "destructive"}
                  className={readinessGate === "GO" ? "mt-2 bg-chart-2/10 text-chart-2 border-chart-2/20" : "mt-2"}
                >
                  {readinessGate}
                </Badge>
              </div>
            </div>
          </div>

          {/* Criteria List */}
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-foreground font-medium">Evaluating PRD against 11 criteria...</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Analyzing business problem, features, technical requirements (~60 seconds)
                </p>
              </div>
            ) : criteria.length > 0 ? (
              <div className="space-y-2">
                {criteria.map((criterion) => (
                  <CriterionItem key={criterion.id} criterion={criterion} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Upload a PRD to see evaluation results
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-6 bg-muted/30 border-t border-border">
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground">
                <strong className="text-foreground">
                  Readiness Gate:
                </strong>{" "}
                {readinessGate} — {readinessReason}
              </p>
              {data && (
                <Button
                  variant={isPaid ? "outline" : "default"}
                  size="sm"
                  onClick={handleExport}
                  className="gap-2"
                >
                  {isPaid ? (
                    <>
                      <Download className="w-4 h-4" />
                      Export Binary Score
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Unlock Export ($0.99)
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        evaluationData={evaluationData}
      />
    </section>
  );
}