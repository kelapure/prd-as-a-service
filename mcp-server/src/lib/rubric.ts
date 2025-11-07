// 11-criterion PRD rubric with names and gating defaults

export interface Criterion {
  id: string;
  name: string;
  shortName: string;
  gating: boolean;
}

export const RUBRIC_CRITERIA: Criterion[] = [
  {
    id: "C1",
    name: "Business Problem Clarity",
    shortName: "Problem Clarity",
    gating: false
  },
  {
    id: "C2",
    name: "Current Process Documentation",
    shortName: "Current Process",
    gating: false
  },
  {
    id: "C3",
    name: "Solution–Problem Alignment",
    shortName: "Solution Alignment",
    gating: true
  },
  {
    id: "C4",
    name: "Narrative Clarity & Plain Language",
    shortName: "Clarity",
    gating: false
  },
  {
    id: "C5",
    name: "Technical Requirements Completeness",
    shortName: "Tech Requirements",
    gating: true
  },
  {
    id: "C6",
    name: "Feature Specificity & Implementation Clarity",
    shortName: "Feature Specificity",
    gating: false
  },
  {
    id: "C7",
    name: "Measurability & Success Criteria",
    shortName: "Measurability",
    gating: false
  },
  {
    id: "C8",
    name: "Consistent Formatting & Structure",
    shortName: "Formatting",
    gating: false
  },
  {
    id: "C9",
    name: "Scope Discipline (Anti-Explosion)",
    shortName: "Scope Discipline",
    gating: false
  },
  {
    id: "C10",
    name: "AI Agent Readiness & Implementability",
    shortName: "Eng Readiness",
    gating: true
  },
  {
    id: "C11",
    name: "AI Agent Task Decomposability",
    shortName: "Agent Decomposability",
    gating: true
  }
];

export const GATING_CRITERIA = RUBRIC_CRITERIA.filter(c => c.gating).map(c => c.id);

export const RUBRIC_VERSION = "v1.0";

// Readiness gate thresholds
export const READINESS_THRESHOLDS = {
  GO_MIN_PASS: 9,          // Must have at least 9/11 passing
  REVISE_MIN_PASS: 7,      // 7-8 passing = Revise
  HOLD_MAX_PASS: 6,        // ≤6 passing = Hold
  HOLD_COMPLIANCE_GAPS: 3  // ≥3 compliance gaps = Hold
} as const;

export function getCriterionById(id: string): Criterion | undefined {
  return RUBRIC_CRITERIA.find(c => c.id === id);
}

export function getCriterionName(id: string): string {
  return getCriterionById(id)?.name || id;
}

export function isGatingCriterion(id: string): boolean {
  return GATING_CRITERIA.includes(id);
}
