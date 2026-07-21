import type { JudgeEnvelope, RubricCriterion } from "../types/judge";

const RUBRIC_NAMES = [
  "Business Problem Clarity and Justification",
  "Current Process Documentation Completeness",
  "Solution-Problem Alignment",
  "Narrative Clarity and Plain Language",
  "Completeness of Technical Requirements",
  "Feature Specificity and Implementation Clarity",
  "Measurability and Success Criteria",
  "Consistent Formatting and Structure",
  "Scope, Discipline, and Anti-Explosion",
  "Implementability and Engineering Readiness",
  "AI Agent Task Decomposability",
  "Falsifiable Bet and Decision Thresholds",
] as const;

const rubricCriteria: RubricCriterion[] = RUBRIC_NAMES.map((name, index) => {
  const id = `C${index + 1}`;
  const passed = [1, 2, 3, 4, 8, 9, 10].includes(index + 1);
  return {
    id,
    name,
    status: passed ? "pass" : "fail",
    structural_deferral: [5, 11].includes(index + 1),
    rationale: passed
      ? "The document provides specific, source-grounded detail for this criterion."
      : index === 11
        ? "The PRD names an outcome but does not define kill, scale, or graduate thresholds."
        : "The document defers the detail required to evaluate this criterion reliably.",
    evidence: [
      {
        status: passed ? "used" : "missing",
        quote: passed
          ? "Claims representatives spend 42 minutes reconciling eligibility across three systems."
          : `No sufficient evidence was found for ${name}.`,
        locator: passed ? "Business problem, page 2" : "Full artifact review",
      },
    ],
  };
});

export const EXAMPLE_RESULT: JudgeEnvelope = {
  schema_version: "evalgpt-prd-judge/v1",
  public_beta: true,
  run: {
    id: "example_public_beta",
    created_at_epoch_ms: Date.UTC(2026, 6, 21),
    elapsed_ms: 73420,
    ephemeral: true,
  },
  versions: {
    judge: "prd-judge-public-beta-v1",
    judge_source_commit: "example",
    judge_manifest_sha256: "example",
    rubric: "prd-eval-rubric-v2",
    rubric_sha256: "example",
    score_derivation: "v1",
    model: "release-candidate",
  },
  input: {
    primary_name: "Synthetic claims workflow PRD-Lite",
    file_types: ["application/pdf"],
    supporting_file_count: 2,
    page_count: 9,
    section_count: 7,
    figure_count: 3,
    warnings: [],
  },
  artifact_profile: {
    preflight_type: "prd-lite",
    recommended_gates: ["customer_value_or_roi_gap"],
  },
  report: {
    artifact_type: "prd-lite",
    summary:
      "The PRD has a coherent problem and solution, but the investment decision and two delivery-critical controls remain unresolved.",
    findings: [
      {
        severity: "P1",
        title: "The business bet has no decision thresholds",
        acknowledged: false,
        gate: "customer_value_or_roi_gap",
        impact:
          "The sponsor cannot distinguish an experiment worth scaling from one that should stop, so approval becomes subjective.",
        required_fix:
          "Add the current handling-time baseline, a 60-day target, and numeric kill, scale, and graduate thresholds tied to the same metric.",
        evidence: [
          {
            source: "Synthetic claims workflow PRD-Lite",
            status: "used",
            quote: "Success will be measured by faster claim handling and strong user adoption.",
            locator: "Measurement, page 7",
          },
        ],
      },
      {
        severity: "P1",
        title: "Manual override ownership is not defined",
        acknowledged: false,
        gate: "implementation_readiness_gap",
        impact:
          "Eligibility exceptions can enter an unowned queue, creating patient-service delays and an audit gap.",
        required_fix:
          "Name the role that receives overrides, define the response-time target, and specify the escalation path when the target is missed.",
        evidence: [
          {
            source: "Synthetic claims workflow PRD-Lite",
            status: "used",
            quote: "Representatives may send uncertain cases for manual review.",
            locator: "Future workflow, page 5",
          },
        ],
      },
      {
        severity: "P2",
        title: "Two workflow terms describe the same state",
        acknowledged: false,
        gate: "",
        impact: "Design and engineering could implement separate states that the product treats as equivalent.",
        required_fix: "Choose either Pending billing review or Cannot verify and use it consistently.",
        evidence: [
          {
            source: "Synthetic claims workflow PRD-Lite",
            status: "summary",
            quote: "The document alternates between Pending billing review and Cannot verify.",
            locator: "Pages 5–6",
          },
        ],
      },
    ],
    evidence_ledger: [
      {
        source: "Synthetic claims workflow PRD-Lite",
        status: "used",
        notes: "Primary artifact under judgment.",
      },
      {
        source: "Discovery transcript",
        status: "used",
        notes: "Validated current handling-time and system-fragmentation claims.",
      },
      {
        source: "Override policy",
        status: "missing",
        notes: "No owner or escalation standard was supplied.",
      },
    ],
    gates_fired: ["customer_value_or_roi_gap", "implementation_readiness_gap"],
    style_flags: ["coherence_gap"],
    required_next_actions: [
      "Define the 60-day kill, scale, and graduate thresholds.",
      "Assign ownership and escalation rules for manual overrides.",
      "Normalize the pending-review terminology.",
    ],
    confidence: "high",
    verdict: "REVISE",
  },
  readiness_score: {
    value: 5,
    out_of: 10,
    derivation_version: "v1",
    band: "REVISE",
    inputs: {
      p0: 0,
      unacknowledged_p1: 2,
      acknowledged_p1: 0,
      style_flags: 1,
    },
  },
  rubric: {
    version: "prd-eval-rubric-v2",
    criteria: rubricCriteria,
    pass_count: 7,
    fail_count: 5,
  },
  validation: {
    ok: true,
    warnings: [],
    used_quotes_verified: true,
    model_fallback_used: false,
  },
};
