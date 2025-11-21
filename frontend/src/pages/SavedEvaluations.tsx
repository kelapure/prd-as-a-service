// Saved evaluations page - displays user's paid PRD evaluations

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listEvaluations, deleteEvaluation, Evaluation } from "../lib/api-auth";
import { Button } from "../components/ui/button";
import { Loader2, FileText, Trash2, Eye, ChevronRight, AlertCircle } from "lucide-react";
import {
  exportBinaryScoreAsMarkdown,
  exportFixPlanAsMarkdown,
  exportAgentTasksAsMarkdown,
  downloadMarkdownFile
} from "../lib/exportMarkdown";

export function SavedEvaluations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    fetchEvaluations();
  }, [user, navigate]);

  const fetchEvaluations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const { evaluations: data } = await listEvaluations(token);
      setEvaluations(data);
    } catch (err: any) {
      console.error("Failed to fetch evaluations:", err);
      setError(err?.message || "Failed to load evaluations");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this evaluation? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingId(id);
      const token = await user.getIdToken();
      await deleteEvaluation(id, token);
      // Remove from local state
      setEvaluations((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      console.error("Failed to delete evaluation:", err);
      alert(err?.message || "Failed to delete evaluation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = (evaluation: Evaluation, format: "binary" | "fixplan" | "tasks") => {
    try {
      let markdown: string;
      let filename: string;

      switch (format) {
        case "binary":
          markdown = exportBinaryScoreAsMarkdown(evaluation.binaryScore);
          filename = `${evaluation.prdTitle}-binary-score.md`;
          break;
        case "fixplan":
          markdown = exportFixPlanAsMarkdown(evaluation.fixPlan);
          filename = `${evaluation.prdTitle}-fix-plan.md`;
          break;
        case "tasks":
          markdown = exportAgentTasksAsMarkdown(evaluation.agentTasks);
          filename = `${evaluation.prdTitle}-agent-tasks.md`;
          break;
      }

      downloadMarkdownFile(markdown, filename);
    } catch (err: any) {
      console.error("Export failed:", err);
      alert("Failed to export evaluation");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your evaluations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Evaluations</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchEvaluations} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (evaluations.length === 0) {
    return (
      <div className="min-h-screen bg-background px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">No Saved Evaluations</h2>
            <p className="text-muted-foreground">
              You haven't saved any PRD evaluations yet. Upload and evaluate a PRD to get started.
            </p>
          </div>
          <Button onClick={() => navigate("/")} className="gap-2">
            Evaluate Your First PRD
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // List of evaluations
  return (
    <div className="min-h-screen bg-background px-6 py-20">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Evaluations</h1>
          <p className="text-muted-foreground">
            {evaluations.length} {evaluations.length === 1 ? "evaluation" : "evaluations"} saved
          </p>
        </div>

        {/* Evaluation cards */}
        <div className="space-y-4">
          {evaluations.map((evaluation) => {
            const score = evaluation.binaryScore;
            const passCount = score?.pass_count || 0;
            const totalCount = score?.criteria?.length || 11;
            const readinessGate = score?.readiness_gate?.state || "UNKNOWN";
            const createdAt = evaluation.createdAt?.toDate?.() || new Date(evaluation.createdAt);

            return (
              <div
                key={evaluation.id}
                className="rounded-[var(--radius-card)] border bg-card p-6 space-y-4"
              >
                {/* Title and date */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {evaluation.prdTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Saved on {createdAt.toLocaleDateString()} at {createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(evaluation.id)}
                      disabled={deletingId === evaluation.id}
                    >
                      {deletingId === evaluation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Score summary */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-semibold text-foreground">
                      {passCount}/{totalCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Gate:</span>
                    <span
                      className={`font-semibold ${
                        readinessGate === "GO"
                          ? "text-chart-2"
                          : readinessGate === "REVISE"
                          ? "text-chart-4"
                          : "text-destructive"
                      }`}
                    >
                      {readinessGate}
                    </span>
                  </div>
                </div>

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(evaluation, "binary")}
                    className="gap-2"
                  >
                    Export Binary Score
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(evaluation, "fixplan")}
                    className="gap-2"
                  >
                    Export Fix Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(evaluation, "tasks")}
                    className="gap-2"
                  >
                    Export Agent Tasks
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back button */}
        <div className="pt-4">
          <Button onClick={() => navigate("/")} variant="ghost" className="gap-2">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

