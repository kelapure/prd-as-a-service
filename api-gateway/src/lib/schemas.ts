// JSON Schemas for EvalPRD MCP Tools
// Frontend-aligned versions with status strings, P0/P1/P2 priorities, etc.

export const SharedInput = {
  type: "object",
  required: ["prd_text"],
  properties: {
    prd_text: { type: "string" },
    artifacts: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "content", "kind"],
        properties: {
          name: { type: "string" },
          content: { type: "string" },
          kind: {
            type: "string",
            enum: ["note", "email", "call_notes", "jira", "spec", "other"]
          }
        },
        additionalProperties: false
      }
    },
    sections: { type: "array", items: { type: "string" } },
    rubric_version: { type: "string", default: "v1.0" }
  },
  additionalProperties: false
} as const;

// Optional: supply peer reviews to compute agreement
export const PeerReviews = {
  type: "array",
  items: {
    type: "object",
    required: ["criteria"],
    properties: {
      criteria: {
        type: "array",
        items: {
          type: "object",
          required: ["id","pass"],
          properties: {
            id: { type: "string", pattern: "^C(1|2|3|4|5|6|7|8|9|10|11)$" },
            pass: { type: "boolean" }
          },
          additionalProperties: false
        }
      }
    },
    additionalProperties: false
  }
} as const;

// -------------------- Binary Score --------------------
export const BinaryScoreInput = {
  type: "object",
  allOf: [SharedInput],
  properties: {
    ...SharedInput.properties,
    evidence_per_criterion: { type: "integer", default: 1, minimum: 0, maximum: 3 },
    fail_on_missing: { type: "boolean", default: true },
    peer_reviews: PeerReviews
  },
  additionalProperties: false
} as const;

export const BinaryScoreOutput = {
  type: "object",
  required: ["rubric_version","prd_title","pass_count","fail_count","criteria","gating_failures","readiness_gate","compliance","agreement"],
  properties: {
    rubric_version: { type: "string" },
    prd_title: { type: "string" },
    pass_count: { type: "integer" },
    fail_count: { type: "integer" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        required: ["id","name","pass","status","rationale","evidence"],
        properties: {
          id: { type: "string", pattern: "^C(1|2|3|4|5|6|7|8|9|10|11)$" },
          name: { type: "string" },
          pass: { type: "boolean" },
          status: { type: "string", enum: ["pass", "fail"] },
          rationale: { type: "string", maxLength: 400 },
          evidence: {
            type: "array",
            items: {
              type: "object",
              required: ["quote", "locator"],
              properties: {
                quote: { type: "string", maxLength: 300 },
                locator: {
                  type: "object",
                  required: ["section", "page"],
                  properties: {
                    section: { type: "string" },
                    page: { type: "string" }
                  },
                  additionalProperties: false
                }
              },
              additionalProperties: false
            }
          }
        },
        additionalProperties: false
      }
    },
    compliance: {
      type: "object",
      required: ["gaps_count","gaps"],
      properties: {
        gaps_count: { type: "integer" },
        gaps: {
          type: "array",
          items: {
            type: "object",
            required: ["area","note","linked_criteria"],
            properties: {
              area: {
                type: "string",
                enum: ["AuditTrail","RBAC","ALCOA+","Part11","Validation","PHI/HIPAA","Veeva/Vault","LIMS/EMR","Other"]
              },
              note: { type: "string", maxLength: 240 },
              linked_criteria: {
                type: "array",
                items: { type: "string", pattern: "^C(5|10)$" }
              }
            },
            additionalProperties: false
          }
        }
      },
      additionalProperties: false
    },
    gating_failures: { type: "array", items: { type: "string" } },
    readiness_gate: {
      type: "object",
      required: ["state","must_pass_met","total_pass","reason"],
      properties: {
        state: { type: "string", enum: ["GO","REVISE","HOLD"] },
        must_pass_met: { type: "boolean" },
        total_pass: { type: "integer" },
        reason: { type: "string" }
      },
      additionalProperties: false
    },
    agreement: {
      type: "object",
      required: ["present","percent_agreement","by_criterion"],
      properties: {
        present: { type: "boolean" },
        percent_agreement: { type: "number" },
        by_criterion: {
          type: "array",
          items: {
            type: "object",
            required: ["id","agreement_pct"],
            properties: {
              id: { type: "string", pattern: "^C(1|2|3|4|5|6|7|8|9|10|11)$" },
              agreement_pct: { type: "number" }
            },
            additionalProperties: false
          }
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const;

// -------------------- Fix Plan --------------------
export const FixPlanInput = {
  type: "object",
  allOf: [SharedInput],
  properties: {
    ...SharedInput.properties,
    limit: { type: "integer", default: 10, minimum: 1 },
    time_horizon_days: { type: "integer", default: 10 },
    include_acceptance_tests: { type: "boolean", default: true }
  },
  additionalProperties: false
} as const;

export const FixPlanOutput = {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["id","title","priority","owner","blocking","effort","impact","description","steps","acceptance_tests","linked_criteria"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          priority: { type: "string", pattern: "^P[0-2]$" },
          owner: { type: "string", maxLength: 100 },
          blocking: { type: "boolean" },
          effort: { type: "string", enum: ["S","M","L"] },
          impact: { type: "string", enum: ["Low","Med","High"] },
          description: { type: "string", maxLength: 1000 },
          steps: { type: "array", items: { type: "string" } },
          acceptance_tests: { type: "array", items: { type: "string" } },
          linked_criteria: {
            type: "array",
            items: { type: "string", pattern: "^C(1|2|3|4|5|6|7|8|9|10|11)$" }
          }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
} as const;

// -------------------- Agent Tasks --------------------
export const AgentTasksInput = {
  type: "object",
  allOf: [SharedInput],
  properties: {
    ...SharedInput.properties,
    task_hours_min: { type: "number", default: 2 },
    task_hours_max: { type: "number", default: 4 },
    feature_filter: { type: "array", items: { type: "string" } },
    emit_mermaid: { type: "boolean", default: false }
  },
  additionalProperties: false
} as const;

export const AgentTasksOutput = {
  type: "object",
  required: ["tasks","edges"],
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        required: ["id","feature","title","description","duration","est_hours","owner_role","entry","exit","test","entry_conditions","exit_conditions","tests","inputs","outputs","status"],
        properties: {
          id: { type: "string" },
          feature: { type: "string" },
          title: { type: "string" },
          description: { type: "string", maxLength: 2000 },
          duration: { type: "string", pattern: "^[0-9]+(h|hr|hours?)$" },
          est_hours: { type: "number" },
          owner_role: { type: "string" },
          entry: { type: "string", maxLength: 1500 },
          exit: { type: "string", maxLength: 1500 },
          test: { type: "string", maxLength: 2000 },
          entry_conditions: { type: "array", items: { type: "string" } },
          exit_conditions: { type: "array", items: { type: "string" } },
          tests: { type: "array", items: { type: "string" } },
          inputs: { type: "array", items: { type: "string" } },
          outputs: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["ready", "blocked", "in_progress", "completed"] }
        },
        additionalProperties: false
      }
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["from","to","type"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          type: { type: "string", enum: ["depends_on", "blocks", "related"] }
        },
        additionalProperties: false
      }
    },
    mermaid: { type: "string" }
  },
  additionalProperties: false
} as const;
