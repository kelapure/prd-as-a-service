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
  | "scoring_draft"
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

export interface ScoreCriterion {
  id: string;
  score: number;
  adjusted_score?: number | null;
  anchor: string;
  evidence: Array<{
    status: "used" | "missing";
    source: string;
    quote: string;
    locator?: string | null;
  }>;
  fix: string;
}

export interface PrdScoreReport {
  instrument: "prd-score";
  mode: "absolute";
  status: "scored" | "not_scored";
  rubric_version: string;
  validation_status: string;
  calculation_version: string;
  artifact: string;
  artifact_gate: {
    pass: boolean;
    reason: string;
    incumbent_replacement: boolean;
    ecosystem_diagrams_present: boolean;
    model_room_requested: boolean;
    model_room_present: boolean;
    commercial_value_over_1m: boolean;
    pricing_decomposition_present: boolean;
  };
  layer1: ScoreCriterion[];
  layer2: ScoreCriterion[];
  layer3: { in_scope: boolean; scores: ScoreCriterion[] };
  integration_context: { customer_named_missing_system: boolean };
  writing_layer: ScoreCriterion[];
  anchor_placement: string;
  length_normalization: {
    applied: boolean;
    line_count: number;
    detail: string;
  };
  hard_caps: Array<{
    cap: string;
    maximum_final_score: number;
    applied: boolean;
  }>;
  integration_subscore: {
    value: number;
    out_of: 10;
    raw_value: number;
    cap_applied: boolean;
  } | null;
  totals: {
    layer1: number;
    layer2_raw: number;
    layer2_adjusted: number;
    layer3: number;
    final_before_cap: number;
    final: number;
    denominator: 100 | 115;
    writing: number;
    writing_denominator: 20;
    historical_threshold: number;
    historical_threshold_met: boolean;
  } | null;
  lowest_three: string[];
  fix_plan_ranked: string[];
}

export interface JudgeEnvelope {
  schema_version: "evalgpt-prd-judge/v2";
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
    prd_score: string;
    prd_score_source_commit: string;
    prd_score_manifest_sha256: string;
    prd_score_calculation: string;
    prd_score_model: string;
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
  prd_score: {
    status: "complete" | "not_scored";
    report: PrdScoreReport;
    validation: {
      ok: boolean;
      warnings?: string[];
      used_quotes_verified?: boolean;
      arithmetic_verified?: boolean;
    };
  };
  validation: {
    ok: boolean;
    warnings: string[];
    used_quotes_verified: boolean;
    prd_score_ok: boolean;
    model_fallback_used: boolean;
  };
}

export interface ProgressUpdate {
  phase: ProgressPhase;
  message: string;
}
