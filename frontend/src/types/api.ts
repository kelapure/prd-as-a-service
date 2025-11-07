// TypeScript types for EvalPRD API responses
// These match the backend schemas exactly

export interface BinaryScoreOutput {
  rubric_version: string;
  prd_title: string;
  pass_count: number;
  fail_count: number;
  criteria: Criterion[];
  compliance: Compliance;
  gating_failures: string[];
  readiness_gate: ReadinessGate;
  agreement: Agreement;
}

export interface Criterion {
  id: string;
  name: string;
  pass: boolean;
  status: "pass" | "fail";
  rationale: string;
  evidence: Evidence[];
}

export interface Evidence {
  quote: string;
  locator: {
    section: string;
    page: string;
  };
}

export interface Compliance {
  gaps_count: number;
  gaps: ComplianceGap[];
}

export interface ComplianceGap {
  area: string;
  note: string;
  linked_criteria: string[];
}

export interface ReadinessGate {
  state: "GO" | "REVISE" | "HOLD";
  must_pass_met: boolean;
  total_pass: number;
  reason: string;
}

export interface Agreement {
  present: boolean;
  percent_agreement: number;
  by_criterion: {
    id: string;
    agreement_pct: number;
  }[];
}

export interface FixPlanOutput {
  items: FixPlanItem[];
}

export interface FixPlanItem {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  owner: string;
  blocking: boolean;
  effort: "S" | "M" | "L";
  impact: "Low" | "Med" | "High";
  description: string;
  steps: string[];
  acceptance_tests: string[];
  linked_criteria: string[];
}

export interface AgentTasksOutput {
  tasks: AgentTask[];
  edges: TaskEdge[];
  mermaid: string;
}

export interface AgentTask {
  id: string;
  feature: string;
  title: string;
  description: string;
  duration: string;
  est_hours: number;
  owner_role: string;
  entry: string;
  exit: string;
  test: string;
  entry_conditions: string[];
  exit_conditions: string[];
  tests: string[];
  inputs: string[];
  outputs: string[];
  status: "ready" | "blocked" | "in_progress" | "completed";
}

export interface TaskEdge {
  from: string;
  to: string;
  type: "depends_on" | "blocks" | "related";
}

export interface EvaluationResults {
  binaryScore: BinaryScoreOutput | null;
  fixPlan: FixPlanOutput | null;
  agentTasks: AgentTasksOutput | null;
}
