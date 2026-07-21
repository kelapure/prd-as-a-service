export type Verdict =
  | "GO"
  | "REVISE"
  | "HOLD"
  | "WRONG_ARTIFACT"
  | "DISQUALIFY_UNTIL_ARCHITECTURE_AUDIT";

export type ProgressPhase =
  | "uploading"
  | "extracting_evidence"
  | "applying_gates"
  | "forming_judgment"
  | "validating_report";

export interface Evidence {
  source: string;
  status: "used" | "missing" | "conflicting" | "assumption" | "summary";
  quote: string;
  locator?: string | null;
}

export interface Finding {
  severity: "P0" | "P1" | "P2";
  title: string;
  acknowledged: boolean;
  gate: string;
  impact: string;
  required_fix: string;
  evidence: Evidence[];
}

export interface JudgeReport {
  artifact_type: string;
  classification_override?: string;
  summary: string;
  findings: Finding[];
  evidence_ledger: Array<{
    source: string;
    status: "used" | "missing" | "conflicting" | "assumption";
    notes: string;
  }>;
  gates_fired: string[];
  style_flags: string[];
  required_next_actions: string[];
  confidence: "high" | "medium" | "low";
  verdict: Verdict;
}

export interface RubricCriterion {
  id: string;
  name: string;
  status: "pass" | "fail";
  rationale: string;
  structural_deferral: boolean;
  evidence: Array<{
    status: "used" | "missing";
    quote: string;
    locator?: string | null;
  }>;
}

export interface JudgeEnvelope {
  schema_version: "evalgpt-prd-judge/v1";
  public_beta: true;
  run: {
    id: string;
    created_at_epoch_ms: number;
    elapsed_ms: number;
    ephemeral: boolean;
  };
  versions: {
    judge: string;
    judge_source_commit: string;
    judge_manifest_sha256: string;
    rubric: string;
    rubric_sha256?: string;
    score_derivation: string;
    model: string;
  };
  input: {
    primary_name: string;
    file_types: string[];
    supporting_file_count: number;
    page_count: number | null;
    section_count: number;
    figure_count: number;
    warnings: string[];
  };
  artifact_profile: {
    preflight_type: string;
    recommended_gates: string[];
  };
  report: JudgeReport;
  readiness_score: {
    value: number;
    out_of: 10;
    derivation_version: string;
    band: Verdict;
    inputs: Record<string, number>;
  };
  rubric: {
    version: "prd-eval-rubric-v2";
    criteria: RubricCriterion[];
    pass_count: number;
    fail_count: number;
  };
  validation: {
    ok: boolean;
    warnings: string[];
    used_quotes_verified: boolean;
    model_fallback_used: boolean;
  };
}

export interface ProgressUpdate {
  phase: ProgressPhase;
  message: string;
}
