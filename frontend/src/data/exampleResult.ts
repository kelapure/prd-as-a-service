import type { JudgeEnvelope, RubricCriterion, ScoreCriterion } from "../types/judge";

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

const RUBRIC_PASS_EVIDENCE: Record<string, [string, string]> = {
  C1: ["Claims representatives spend 42 minutes reconciling eligibility across three systems.", "Business problem, page 2"],
  C2: ["Representatives open PortalOne, Orbit, and the payer site before they can answer a caller.", "Current workflow, page 3"],
  C3: ["A guided eligibility workspace addresses the reconciliation delay without replacing the source systems.", "Solution overview, page 4"],
  C4: ["Use plain labels in the interface: Eligible, Needs review, and Cannot verify.", "Language standards, page 6"],
  C8: ["The document uses Problem, Workflow, Scope, Measurement, and Risks as its primary sections.", "Document structure"],
  C9: ["Phase one excludes claim adjudication, payment posting, and payer contracting.", "Scope boundary, page 6"],
  C10: ["The workspace reads eligibility from PortalOne and writes only the review disposition.", "Technical surface, page 8"],
};

const RUBRIC_FAIL_RATIONALE: Record<string, string> = {
  C5: "The PRD-Lite intentionally defers the detailed exception-state model required by this check.",
  C6: "Several requirements describe outcomes but do not give engineering testable behavior.",
  C7: "The measurement section names direction but omits numeric success and stop thresholds.",
  C11: "The PRD-Lite intentionally defers task-level decomposition and delivery sequencing.",
  C12: "The document names success but does not define kill, scale, or graduate decisions.",
};

const rubricCriteria: RubricCriterion[] = RUBRIC_NAMES.map((name, index) => {
  const id = `C${index + 1}`;
  const passed = [1, 2, 3, 4, 8, 9, 10].includes(index + 1);
  const passEvidence = RUBRIC_PASS_EVIDENCE[id];
  return {
    id,
    name,
    status: passed ? "pass" : "fail",
    structural_deferral: [5, 11].includes(index + 1),
    rationale: passed
      ? "The document provides specific, source-grounded detail for this criterion."
      : RUBRIC_FAIL_RATIONALE[id],
    evidence: [
      {
        status: passed ? "used" : "missing",
        quote: passed
          ? passEvidence[0]
          : `No sufficient evidence was found for ${name}.`,
        locator: passed ? passEvidence[1] : "Full artifact review",
      },
    ],
  };
});

const SCORE_EVIDENCE: Record<string, [string, string]> = {
  C1: ["Claims representatives spend 42 minutes reconciling eligibility across three systems.", "Business problem, page 2"],
  C2: ["The July payer transition makes eligibility accuracy the sponsor's first operating priority.", "Why now, page 2"],
  C3: ["Phase one will extend the existing PortalOne eligibility API.", "Options considered, page 4"],
  C4: ["Claims representative, team supervisor, and compliance reviewer are the three product roles.", "Users and roles, page 4"],
  C5: ["A representative searches the member, compares returned coverage, and records a disposition.", "Future workflow, page 5"],
  C6: ["Phase one includes eligibility lookup, discrepancy review, and a manual-review handoff.", "Scope, page 6"],
  C7: ["Claim adjudication and payment posting may follow in a later phase.", "Out of scope, page 6"],
  C8: ["Success will be measured by faster claim handling and strong user adoption.", "Measurement, page 7"],
  C9: ["Primary risks are stale payer data, incorrect overrides, and low representative adoption.", "Risks, page 8"],
  C10: ["PortalOne exposes member search and eligibility-read endpoints.", "Technical surface, page 8"],
  C11: ["The sponsor will review pilot performance after 60 days.", "Decision plan, page 7"],
  M1: ["Representatives open PortalOne, Orbit, and the payer site in sequence for every uncertain claim.", "Discovery synthesis, page 3"],
  M2: ["Needs review means the returned payer status conflicts with the member record.", "Domain glossary, page 3"],
  M3: ["Orbit receives a nightly eligibility file from an unspecified middleware service.", "System context, page 8"],
  M4: ["Regional teams apply different documentation rules before accepting an override.", "Operating variation, page 3"],
  M5: ["A supervisor may approve an override after reviewing the supporting note.", "Permissions, page 5"],
  M6: ["A review moves from Open to Pending evidence to Resolved.", "Artifact lifecycle, page 5"],
  M7: ["Representatives may send uncertain cases for manual review.", "Exception workflow, page 5"],
  M8: ["Set the case to Pending billing review and display Cannot verify as the representative-facing status.", "Workflow terminology, pages 5–6"],
  M9: ["The pilot compares five representatives against the current 42-minute handling-time baseline.", "Pilot plan, page 7"],
  W1: ["Uncertain cases go to manual review. Success is faster claim handling and strong adoption.", "Pages 5–7"],
  W2: ["The 42-minute baseline comes from the May time study covering 63 eligibility calls.", "Evidence notes, page 2"],
  W3: ["Payer means the health plan; disposition means the final eligibility outcome; override means a supervisor-approved exception.", "Domain glossary, page 3"],
  W4: ["The workspace removes tab switching by showing PortalOne, Orbit, and payer responses in one view.", "Solution rationale, page 4"],
};

const SCORE_FIXES: Record<string, string> = {
  C3: "Compare extending PortalOne with buying a payer-aggregation service and state the deciding constraint.",
  C5: "Add the exception branches and state transitions to the future workflow.",
  C7: "Name the deferred claims workflows and the roadmap decision for each.",
  C8: "Add numeric 60-day adoption, handling-time, and error-rate acceptance thresholds.",
  C9: "Give each named risk an owner, trigger, and mitigation.",
  C10: "Specify API ownership, latency, availability, and failure behavior.",
  C11: "Define the project-specific kill, scale, and graduate decision.",
  M1: "Validate the three-system sequence with supervisors from each operating region.",
  M2: "Define eligibility, discrepancy, override, and disposition with source-system ownership.",
  M3: "Map the eligibility middleware, source-of-truth boundaries, and reconciliation path.",
  M4: "Model the regional policy variants and identify which can be configured.",
  M5: "Define who may request, approve, revoke, and audit an override.",
  M6: "Add reopen, expiry, reassignment, and audit-history behavior to the review lifecycle.",
  M7: "Assign the manual-review queue, response target, and missed-target escalation.",
  M8: "Choose one unresolved-state term and update every workflow and requirement.",
  W1: "Repair the transition between the exception workflow and measurement sections.",
  W3: "Split the longest requirement sentences and keep each requirement to one testable behavior.",
  W4: "Contrast the proposed workspace with continued portal use and a purchased aggregator.",
};

const SCORE_ANCHORS: Record<number, string> = {
  0: "absent",
  1: "acknowledged but unsupported",
  2: "partially addressed; major buyer questions remain",
  3: "adequate direction with implementation gaps",
  4: "strong, specific, and buyer-relevant",
  5: "exceptional, complete, and decision-ready",
};

const makeScoreCriterion = (
  id: string,
  score: number,
  adjustedScore = score,
): ScoreCriterion => ({
  id,
  score,
  adjusted_score: adjustedScore,
  anchor: `${score}: ${SCORE_ANCHORS[score]}`,
  evidence: [{
    status: "used",
    source: "Synthetic claims workflow PRD-Lite",
    quote: SCORE_EVIDENCE[id][0],
    locator: SCORE_EVIDENCE[id][1],
  }],
  fix: score >= 4 ? "" : SCORE_FIXES[id],
});

const layer1Scores = [4, 4, 3, 4, 3, 4, 2, 3, 3, 3, 3];
const layer2Scores = [3, 3, 1, 3, 2, 3, 2, 3, 4];
const adjustedLayer2 = [4, 4, 2, 3, 3, 3, 3, 3, 4];
const writingScores = [2, 4, 3, 3];

export const EXAMPLE_RESULT: JudgeEnvelope = {
  schema_version: "evalgpt-prd-judge/v2",
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
    prd_score: "prd-score-public-beta-v1",
    prd_score_source_commit: "example",
    prd_score_manifest_sha256: "example",
    prd_score_calculation: "prd-score-calculation-v1",
    prd_score_model: "release-candidate",
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
  prd_score: {
    status: "complete",
    report: {
      instrument: "prd-score",
      mode: "absolute",
      status: "scored",
      rubric_version: "v2.1-core + writing-layer-2026-07-06",
      validation_status: "rubric core calibrated n=5 (2026-05); writing layer UNVALIDATED",
      calculation_version: "prd-score-calculation-v1",
      artifact: "Synthetic claims workflow PRD-Lite",
      artifact_gate: {
        pass: true,
        reason: "The scoring bundle is complete.",
        incumbent_replacement: false,
        ecosystem_diagrams_present: false,
        model_room_requested: false,
        model_room_present: false,
        commercial_value_over_1m: false,
        pricing_decomposition_present: false,
      },
      layer1: layer1Scores.map((score, index) => makeScoreCriterion(`C${index + 1}`, score)),
      layer2: layer2Scores.map((score, index) => makeScoreCriterion(`M${index + 1}`, score, adjustedLayer2[index])),
      layer3: { in_scope: false, scores: [] },
      integration_context: { customer_named_missing_system: false },
      writing_layer: writingScores.map((score, index) => makeScoreCriterion(`W${index + 1}`, score)),
      anchor_placement: "Calibration context only: this draft sits below the five-PRD won-deal average and above the loss anchor.",
      length_normalization: {
        applied: true,
        line_count: 76,
        detail: "Applied +1, capped at 5, to M1, M2, M3, M5, and M7.",
      },
      hard_caps: [],
      integration_subscore: {
        value: 5.5,
        out_of: 10,
        raw_value: 5.5,
        cap_applied: false,
      },
      totals: {
        layer1: 36,
        layer2_raw: 24,
        layer2_adjusted: 29,
        layer3: 0,
        final_before_cap: 65,
        final: 65,
        denominator: 100,
        writing: 12,
        writing_denominator: 20,
        historical_threshold: 70,
        historical_threshold_met: false,
      },
      lowest_three: ["C7", "M3", "W1"],
      fix_plan_ranked: [
        "C7: Name the deferred claims workflows and the roadmap decision for each.",
        "M3: Map the eligibility middleware, source-of-truth boundaries, and reconciliation path.",
        "W1: Repair the transition between the exception workflow and measurement sections.",
      ],
    },
    validation: {
      ok: true,
      warnings: [],
      used_quotes_verified: true,
      arithmetic_verified: true,
    },
  },
  validation: {
    ok: true,
    warnings: [],
    used_quotes_verified: true,
    prd_score_ok: true,
    model_fallback_used: false,
  },
};
