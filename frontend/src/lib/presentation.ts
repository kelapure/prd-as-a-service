import type { Verdict } from "../types/judge";


export const VERDICT_LABELS: Record<Verdict, string> = {
  GO: "Go",
  REVISE: "Revise",
  HOLD: "Hold",
  WRONG_ARTIFACT: "Wrong artifact",
  DISQUALIFY_UNTIL_ARCHITECTURE_AUDIT: "Architecture audit required",
};

export const SCORE_NAMES: Record<string, string> = {
  C1: "Quantified business problem and why now",
  C2: "Strategic framing",
  C3: "Build, buy, or extend rationale",
  C4: "Product definition and user roles",
  C5: "Current and future workflow",
  C6: "Tradeable scope atoms",
  C7: "Out of scope and roadmap",
  C8: "Success and MVP acceptance gate",
  C9: "Risk register",
  C10: "Technical surface",
  C11: "Project-specific critical factor",
  M1: "Customer operating model accuracy",
  M2: "Domain concept correctness",
  M3: "System-of-systems completeness",
  M4: "Governance and variability",
  M5: "Permissions and policy enforcement",
  M6: "Core artifact lifecycle",
  M7: "Exception coverage",
  M8: "Consistency audit",
  M9: "Proof path",
  P1: "Demonstrated competence",
  P2: "Confidence-projecting commitments",
  P3: "Commercial structure",
  W1: "Coherence",
  W2: "Evidence grounding",
  W3: "Prose mechanics",
  W4: "Specificity against the alternative",
};

export function humanize(value: string): string {
  const artifactLabels: Record<string, string> = {
    "prd-lite": "PRD-Lite",
    "full-prd": "Full PRD",
    "mini-prd": "Mini-PRD",
    "rfp-rfi-response": "RFP/RFI response",
  };
  if (artifactLabels[value]) return artifactLabels[value];
  const acronyms = new Set(["ai", "prd", "rbac", "rfp", "rfi", "roi"]);
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .map((word) => acronyms.has(word.toLowerCase()) ? word.toUpperCase() : word)
    .join(" ");
}

export function scoreFixParts(fix: string): {
  id: string;
  name: string;
  action: string;
} {
  const match = /^([CMPW]\d+):\s*(.+)$/u.exec(fix.trim());
  const id = match?.[1] || "";
  return {
    id,
    name: SCORE_NAMES[id] || "Draft-strength dimension",
    action: match?.[2] || fix,
  };
}

export function scoreDisplay(
  score: number,
  adjustedScore: number | undefined,
): string {
  if (adjustedScore !== undefined && adjustedScore !== score) {
    const rule = adjustedScore > score ? "normalized" : "capped";
    return `${score}→${adjustedScore}/5 · ${rule}`;
  }
  return `${adjustedScore ?? score}/5`;
}
