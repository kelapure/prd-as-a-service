// TypeScript types for EvalPRD MCP server

export interface Artifact {
  name: string;
  content: string;
  kind?: "note" | "email" | "call_notes" | "jira" | "spec" | "other";
}

export interface SharedInput {
  prd_text: string;
  artifacts?: Artifact[];
  sections?: string[];
  rubric_version?: string;
}

// Binary Score Types
export interface BinaryScoreInput extends SharedInput {
  evidence_per_criterion?: number;
  fail_on_missing?: boolean;
  peer_reviews?: PeerReview[];
}

export interface PeerReview {
  criteria: Array<{
    id: string;
    pass: boolean;
  }>;
}

export interface Evidence {
  quote: string;
  locator?: {
    section?: string;
    page?: string;
  };
}

export interface CriterionResult {
  id: string;
  name: string;
  pass: boolean;
  status: "pass" | "fail";
  rationale: string;
  evidence: Evidence[];
}

export interface ComplianceGap {
  area: "AuditTrail" | "RBAC" | "ALCOA+" | "Part11" | "Validation" | "PHI/HIPAA" | "Veeva/Vault" | "LIMS/EMR" | "Other";
  note: string;
  linked_criteria?: string[];
}

export interface ReadinessGate {
  state: "GO" | "REVISE" | "HOLD";
  must_pass_met: boolean;
  total_pass: number;
  reason: string;
}

export interface Agreement {
  present: boolean;
  percent_agreement?: number;
  by_criterion?: Array<{
    id: string;
    agreement_pct: number;
  }>;
}

export interface BinaryScoreOutput {
  rubric_version: string;
  prd_title?: string;
  pass_count: number;
  fail_count: number;
  criteria: CriterionResult[];
  compliance: {
    gaps_count: number;
    gaps: ComplianceGap[];
  };
  gating_failures: string[];
  readiness_gate: ReadinessGate;
  agreement?: Agreement;
}

// Fix Plan Types
export interface FixPlanInput extends SharedInput {
  limit?: number;
  time_horizon_days?: number;
  include_acceptance_tests?: boolean;
}

export interface FixPlanItem {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  owner: string;
  blocking: boolean;
  effort?: "S" | "M" | "L";
  impact?: "Low" | "Med" | "High";
  description: string;
  steps: string[];
  acceptance_tests?: string[];
  linked_criteria?: string[];
}

export interface FixPlanOutput {
  items: FixPlanItem[];
}

// Agent Tasks Types
export interface AgentTasksInput extends SharedInput {
  task_hours_min?: number;
  task_hours_max?: number;
  feature_filter?: string[];
  emit_mermaid?: boolean;
}

export interface AgentTask {
  id: string;
  feature?: string;
  title: string;
  description: string;
  duration: string;
  est_hours: number;
  owner_role?: string;
  entry: string;
  exit: string;
  test: string;
  entry_conditions?: string[];
  exit_conditions?: string[];
  tests?: string[];
  inputs?: string[];
  outputs?: string[];
  status?: "ready" | "blocked" | "in_progress" | "completed";
}

export interface TaskEdge {
  from: string;
  to: string;
  type?: "depends_on" | "blocks" | "related";
}

export interface AgentTasksOutput {
  tasks: AgentTask[];
  edges: TaskEdge[];
  mermaid?: string;
}
