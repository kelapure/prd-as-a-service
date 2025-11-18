import { Play, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import type { AgentTasksOutput } from "../types/api";
import taskGraphImg from "../assets/task-graph.png";

interface HeroAgentTasksCardProps {
  data: AgentTasksOutput | null;
  isLoading?: boolean;
}

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
    icon: Play
  },
  completed: {
    label: "Completed",
    className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    icon: Play
  }
};

export function HeroAgentTasksCard({ data, isLoading }: HeroAgentTasksCardProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full flex flex-col shadow-[var(--elevation-sm)] hover:shadow-[var(--elevation-md)] transition-shadow duration-300 bg-card border border-border rounded-[var(--radius-card)] overflow-hidden">
        <div className="w-full h-full flex items-center justify-center p-0">
          <img 
            src={taskGraphImg} 
            alt="Agent Tasks Example" 
            className="w-full h-full object-contain"
          />
        </div>
      </Card>
    );
  }

  const tasks = data.tasks || [];
  const totalHours = tasks.reduce((sum, task) => sum + task.est_hours, 0);
  
  const readyTasks = tasks.filter(t => t.status === "ready");
  const blockedTasks = tasks.filter(t => t.status === "blocked");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");
  
  // Get top 3 tasks (prioritize ready, then blocked, then others)
  const topTasks = [
    ...readyTasks.slice(0, 2),
    ...blockedTasks.slice(0, 1),
    ...tasks.slice(0, 3)
  ].slice(0, 3);

  const handleClick = () => {
    // Ensure results section is visible, then scroll to agent tasks
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        document.getElementById('agent-tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            Agent Tasks
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {tasks.length} tasks
            </span>
            {readyTasks.length > 0 && (
              <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20 text-xs">
                {readyTasks.length} ready
              </Badge>
            )}
            {blockedTasks.length > 0 && (
              <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs">
                {blockedTasks.length} blocked
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pt-6 pb-4 space-y-4">
        {/* Stats */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            {totalHours}h
          </div>
          <p className="text-xs text-muted-foreground">
            Total estimated effort
          </p>
        </div>

        {/* Top Tasks */}
        <div className="space-y-3">
          {topTasks.map((task) => {
            const statusInfo = statusConfig[task.status] || statusConfig.ready;
            const StatusIcon = statusInfo.icon;

            return (
              <div key={task.id} className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={statusInfo.className + " text-xs gap-1"}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {task.duration}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.feature}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer Link */}
        <div className="pt-2 border-t border-border/30 mt-4">
          <button
            onClick={handleClick}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            View full task graph <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

