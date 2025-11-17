import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckSquare, Play, Flag, AlertTriangle, Clock, Loader2, Download } from "lucide-react";
import { exportAgentTasksAsMarkdown, downloadMarkdownFile } from "../lib/exportMarkdown";
import type { AgentTasksOutput } from "../types/api";

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  ready: {
    label: "Ready",
    className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    icon: Play
  },
  blocked: {
    label: "Blocked",
    className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    icon: AlertTriangle
  },
  in_progress: {
    label: "In Progress",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: Clock
  },
  completed: {
    label: "Completed",
    className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    icon: CheckSquare
  }
};

interface AgentTasksExampleProps {
  data: AgentTasksOutput | null;
  isLoading?: boolean;
}

export function AgentTasksExample({ data, isLoading }: AgentTasksExampleProps) {
  const tasks = data?.tasks || [];
  const totalHours = tasks.reduce((sum, task) => sum + task.est_hours, 0);
  const mermaidContainerRef = useRef<HTMLDivElement | null>(null);
  const mermaidInitializedRef = useRef(false);
  const renderIdRef = useRef(0);
  const [graphError, setGraphError] = useState<string | null>(null);

  // Debug logging
  console.log('[AgentTasksExample] Rendered with:', {
    isLoading,
    hasData: !!data,
    tasksCount: tasks.length,
    data: data
  });

  useEffect(() => {
    if (!data?.mermaid || !mermaidContainerRef.current) {
      if (mermaidContainerRef.current) {
        mermaidContainerRef.current.innerHTML = "";
      }
      return;
    }

    if (!mermaidInitializedRef.current) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "neutral",
        flowchart: { curve: "basis" }
      });
      mermaidInitializedRef.current = true;
    }

    const renderId = `agent-tasks-graph-${renderIdRef.current++}`;
    let isActive = true;
    setGraphError(null);

    mermaid
      .render(renderId, data.mermaid)
      .then(({ svg }) => {
        if (!isActive || !mermaidContainerRef.current) {
          return;
        }
        mermaidContainerRef.current.innerHTML = svg;
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setGraphError(error instanceof Error ? error.message : "Unable to render graph");
        if (mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = "";
        }
      });

    return () => {
      isActive = false;
    };
  }, [data?.mermaid]);

  const handleExport = () => {
    if (!data) return;
    const markdown = exportAgentTasksAsMarkdown(data);
    downloadMarkdownFile(markdown, 'prd-agent-tasks.md');
  };

  return (
    <section id="agent-tasks" className="px-6 py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-8">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <h2 className="text-foreground">AI Agent-Executable Task Graph</h2>
            <p className="text-muted-foreground">
              Decomposed into 2-4 hour units with explicit inputs, outputs, and acceptance tests—ready for AI agents like Cursor, Devin, or Copilot
            </p>
          </div>

          {/* Graph View */}
          {data?.mermaid && (
            <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--elevation-sm)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground">Agent Task Dependency Graph</h3>
                    <p className="text-sm text-muted-foreground">
                      Visual DAG emitted by EvalPRD ({tasks.length} tasks, {data.edges?.length ?? 0} links)
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {graphError ? (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive text-sm">
                    Unable to render graph: {graphError}
                  </div>
                ) : (
                  <div
                    ref={mermaidContainerRef}
                    className="overflow-auto w-full"
                    aria-label="Agent task dependency graph"
                  />
                )}
              </div>
            </div>
          )}

          {/* Tasks Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="col-span-2 bg-card rounded-[var(--radius-card)] border border-border p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-foreground font-medium">Generating task graph...</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Decomposing PRD into AI-executable tasks with dependencies (2-3 minutes)
                </p>
              </div>
            ) : tasks.length > 0 ? (
              tasks.map((task) => {
                const statusInfo = statusConfig[task.status] || statusConfig.ready;
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={task.id}
                    className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--elevation-sm)] overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-6 pb-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                              {task.id}
                            </span>
                          </div>
                          <div>
                            <div className="text-muted-foreground">
                              {task.feature}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={statusInfo.className + " gap-1 flex-shrink-0"}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <h4 className="text-foreground">{task.title}</h4>
                      <p className="text-muted-foreground">
                        {task.description}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="px-6 pb-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                            Duration
                          </div>
                          <div className="text-sm text-foreground font-medium">
                            {task.duration} ({task.est_hours}h)
                          </div>
                        </div>
                        {task.owner_role && (
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                              Owner Role
                            </div>
                            <div className="text-sm text-foreground font-medium">
                              {task.owner_role}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Inputs/Outputs */}
                      {((task.inputs && task.inputs.length > 0) || (task.outputs && task.outputs.length > 0)) && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                          {task.inputs && task.inputs.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                                Inputs
                              </div>
                              <ul className="space-y-1">
                                {task.inputs.map((input, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-1">
                                    <span className="text-primary">→</span>
                                    <span>{input}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {task.outputs && task.outputs.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                                Outputs
                              </div>
                              <ul className="space-y-1">
                                {task.outputs.map((output, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-1">
                                    <span className="text-chart-2">←</span>
                                    <span>{output}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Entry/Exit/Test Summary */}
                      <div className="space-y-3 pt-2 border-t border-border">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                            Entry Condition
                          </div>
                          <div className="text-sm text-foreground leading-relaxed">
                            {task.entry}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                            Exit Condition
                          </div>
                          <div className="text-sm text-foreground leading-relaxed">
                            {task.exit}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                            Acceptance Test
                          </div>
                          <div className="text-sm text-foreground leading-relaxed">
                            {task.test}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 bg-card rounded-[var(--radius-card)] border border-border p-12 text-center">
                <p className="text-muted-foreground">
                  Upload a PRD to see AI agent-executable task breakdown
                </p>
              </div>
            )}
          </div>

          {/* Summary */}
          {tasks.length > 0 && (
            <div className="bg-muted/30 rounded-[var(--radius-card)] p-6 border border-border text-center">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{tasks.length} tasks</strong> totaling{" "}
                <strong className="text-foreground">{totalHours} hours</strong> of estimated effort
              </p>
            </div>
          )}

          {/* Export Button */}
          {data && tasks.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export Task Graph
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}