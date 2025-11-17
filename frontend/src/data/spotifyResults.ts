// Spotify PRD evaluation results - golden test data
// This data is used for the hero section to display example results

import type {
  BinaryScoreOutput,
  FixPlanOutput,
  AgentTasksOutput,
} from "../types/api";

export const spotifyBinaryScore: BinaryScoreOutput = {
  rubric_version: "v1.0",
  prd_title: "Spotify Rewards System PRD",
  pass_count: 2,
  fail_count: 9,
  criteria: [
    {
      id: "C1",
      name: "Business Problem Clarity",
      pass: true,
      status: "pass",
      rationale: "Problem, audience, and impact are stated with survey data and MAU sizing.",
      evidence: [
        {
          quote: "Users aged 18–24 are dissatisfied… poor song recommendations and excessive ads… low conversion to premium",
          locator: {
            section: "Problem Statement",
            page: "1"
          }
        },
        {
          quote: "86%… a lot of ads… 28%… poor music recommendation… only 6%… premium is expensive",
          locator: {
            section: "Survey Results",
            page: "2"
          }
        }
      ]
    },
    {
      id: "C2",
      name: "Current Process Documentation",
      pass: false,
      status: "fail",
      rationale: "No 'current state' of free-tier listening journey, ad cadence, or recos pipeline is documented.",
      evidence: [
        {
          quote: "No narrative/flow of 'today' (only personas and proposed solutions, pp.3–5)",
          locator: {
            section: "Missing",
            page: "3-5"
          }
        }
      ]
    },
    {
      id: "C3",
      name: "Solution–Problem Alignment",
      pass: false,
      status: "fail",
      rationale: "Rewards and hyper-local/chatbot partly address discovery but do not reduce ad load—the #1 pain—and include unrelated features.",
      evidence: [
        {
          quote: "Daily Reward… 90 minutes → premium playlist… Weekly Reward… 1-day Premium",
          locator: {
            section: "Proposed Solutions",
            page: "4-5"
          }
        },
        {
          quote: "86%… a lot of ads",
          locator: {
            section: "Survey Results",
            page: "2"
          }
        },
        {
          quote: "no requirement to reduce ads in free tier",
          locator: {
            section: "Missing",
            page: "N/A"
          }
        }
      ]
    },
    {
      id: "C4",
      name: "Narrative Clarity & Plain Language",
      pass: true,
      status: "pass",
      rationale: "Language is plain and understandable; acronyms are minimal.",
      evidence: [
        {
          quote: "Clear, active statements in Goals/Metrics",
          locator: {
            section: "Goals/Metrics",
            page: "1,5"
          }
        }
      ]
    },
    {
      id: "C5",
      name: "Technical Requirements Completeness",
      pass: false,
      status: "fail",
      rationale: "Lacks API/endpoint/auth specs, data validation, privacy/consent details for location, fraud/abuse rules, and performance targets.",
      evidence: [
        {
          quote: "Integration: Provide temporary premium playlist access via tokens",
          locator: {
            section: "Integration",
            page: "6"
          }
        },
        {
          quote: "no API/auth/SLAs; location used in 'Hyper Localised' without consent policy",
          locator: {
            section: "Missing",
            page: "4"
          }
        }
      ]
    },
    {
      id: "C6",
      name: "Feature Specificity & Implementation Clarity",
      pass: false,
      status: "fail",
      rationale: "Features are high-level; acceptance criteria, business rules, and UI/UX states are mostly missing.",
      evidence: [
        {
          quote: "Reward thresholds given (90 mins) but no exact unlock/expiry rules; chatbot logic unspecified",
          locator: {
            section: "Features",
            page: "4-6"
          }
        }
      ]
    },
    {
      id: "C7",
      name: "Measurability & Success Criteria",
      pass: false,
      status: "fail",
      rationale: "Metrics listed but no numeric targets, baselines, or acceptance conditions.",
      evidence: [
        {
          quote: "Key Metrics… Time Spent Listening, Avg Session Duration… without thresholds",
          locator: {
            section: "Key Metrics",
            page: "5,7"
          }
        }
      ]
    },
    {
      id: "C8",
      name: "Formatting & Structure",
      pass: false,
      status: "fail",
      rationale: "Sections mix bullets/tables/images without a consistent template; diagrams embedded without cross-refs.",
      evidence: [
        {
          quote: "Personas/solutions as blocks; 'System Design' image lacks figure ref",
          locator: {
            section: "Multiple",
            page: "3-6"
          }
        }
      ]
    },
    {
      id: "C9",
      name: "Scope, Discipline, Anti-Explosion",
      pass: false,
      status: "fail",
      rationale: "Three divergent solutions (rewards, chatbot, hyper-local) plus marketing plan create scope sprawl vs. one problem.",
      evidence: [
        {
          quote: "Proposed Solutions: Reward System… Mood AI Chat Bot… Hyper Localised Playlist",
          locator: {
            section: "Proposed Solutions",
            page: "4-5"
          }
        }
      ]
    },
    {
      id: "C10",
      name: "Implementability & Eng Readiness",
      pass: false,
      status: "fail",
      rationale: "Engineers can't build without API contracts, data schemas, consent flows, or ad-stack changes.",
      evidence: [
        {
          quote: "Schema Changes… daily_listening_time… but no full ERD, endpoints, or error contracts; only generic tracking plan",
          locator: {
            section: "Schema Changes / Tracking",
            page: "6-7"
          }
        }
      ]
    },
    {
      id: "C11",
      name: "AI Agent Task Decomposability",
      pass: false,
      status: "fail",
      rationale: "Insufficient granularity (no API params, validation rules, or deterministic states) to auto-generate 2–4h tasks.",
      evidence: [
        {
          quote: "Chatbot and hyper-local features lack input/output formats and error states",
          locator: {
            section: "Features",
            page: "4"
          }
        }
      ]
    }
  ],
  compliance: {
    gaps_count: 0,
    gaps: []
  },
  gating_failures: ["C3", "C5", "C10", "C11"],
  readiness_gate: {
    state: "HOLD",
    must_pass_met: false,
    total_pass: 2,
    reason: "Fails all four must-pass gates (C3 Solution Alignment, C5 Technical Requirements, C10 Implementability, C11 Agent Decomposability). Needs Fix Plan items 1–8 completed to move to Revise, then target ≥9/11 with must-pass = PASS for Go."
  },
  agreement: {
    present: false,
    percent_agreement: 0,
    by_criterion: []
  }
};

export const spotifyFixPlan: FixPlanOutput = {
  items: [
    {
      id: "fix-1",
      title: "Narrow Scope to a Single MVP: Rewards for Free-Tier Listening (R1)",
      priority: "P0",
      owner: "PM",
      blocking: true,
      effort: "S",
      impact: "High",
      description: "Rewrite: 'R1 focuses solely on Rewards MVP; Chatbot and Hyper-Local move to R2 backlog.'",
      steps: [
        "Remove chatbot and hyper-local features from R1 scope",
        "Update release plan to show only Rewards features",
        "Move chatbot/hyper-local to R2 backlog with dependencies"
      ],
      acceptance_tests: [
        "PRD contains only Rewards features",
        "Release plan excludes chatbot/hyper-local"
      ],
      linked_criteria: ["C3", "C9"]
    },
    {
      id: "fix-2",
      title: "Add Current-State Journey & Baseline Metrics",
      priority: "P0",
      owner: "UX Research",
      blocking: true,
      effort: "M",
      impact: "High",
      description: "Rewrite: 'Document free-tier session: Open → first play → ad break timing → skip/exit. Include baseline: TSL p50, ad exposures/session, recos CTR, bounce.'",
      steps: [
        "Create current-state journey map showing free-tier user flow",
        "Document ad cadence and timing",
        "Measure baseline metrics (TSL p50, ad exposures, CTR, bounce rate)",
        "Add swimlane diagram or detailed narrative"
      ],
      acceptance_tests: [
        "One page narrative + swimlane showing current state",
        "Numeric baselines logged in appendix"
      ],
      linked_criteria: ["C2"]
    },
    {
      id: "fix-3",
      title: "Tie Solution to Top Pain (Ads) or Declare Non-Goal",
      priority: "P0",
      owner: "PM + Ads Eng",
      blocking: true,
      effort: "S",
      impact: "High",
      description: "Rewrite: Add either (a) 'free-tier ad load stays constant; goal is engagement despite ads' or (b) 'R1 reduces ad frequency for streaking users by X%.'",
      steps: [
        "Decide on ad policy: constant vs reduced frequency",
        "If reducing ads: specify exact reduction amount (e.g., ≤4 ad pods/hour)",
        "Document in PRD as explicit goal or non-goal"
      ],
      acceptance_tests: [
        "Explicit non-goal OR measurable ad policy change (e.g., '≤4 ad pods/hour for on-track users')"
      ],
      linked_criteria: ["C3"]
    },
    {
      id: "fix-4",
      title: "Write Implementable Requirements for Rewards",
      priority: "P0",
      owner: "PM + Backend",
      blocking: true,
      effort: "M",
      impact: "High",
      description: "Rewrite (example spec): 'Daily goal = 90m playback (≥85% foreground or cast; excludes muted/background>10m). Unlock: 1 premium playlist token valid until 23:59 local; single device; non-transferable. Weekly streak: 7 consecutive days → 24h Premium Trial; cooldown 30 days.'",
      steps: [
        "Define daily goal with specific thresholds (90m playback)",
        "Specify foreground vs background detection rules",
        "Define token properties (validity, device restriction, transferability)",
        "Specify streak logic and cooldown periods"
      ],
      acceptance_tests: [
        "Unit tests for threshold edges",
        "Timezone rollover tests",
        "Cooldown validation tests"
      ],
      linked_criteria: ["C6", "C10", "C11"]
    },
    {
      id: "fix-5",
      title: "Define API Contracts & Auth",
      priority: "P0",
      owner: "Backend",
      blocking: true,
      effort: "M",
      impact: "High",
      description: "Rewrite: Specify endpoints (e.g., POST /v1/rewards/claim, GET /v1/rewards/status), OAuth2 flows, idempotency keys, latency/availability SLOs, error codes.",
      steps: [
        "Document all API endpoints with HTTP methods",
        "Specify OAuth2 authentication flow",
        "Define idempotency key handling",
        "Set SLOs (p95≤300ms for reads, 99.9% uptime)",
        "Document error codes (401, 403, 409, 410, 429, 5xx)"
      ],
      acceptance_tests: [
        "OpenAPI spec v3 with examples",
        "p95≤300ms for reads",
        "99.9% uptime target documented"
      ],
      linked_criteria: ["C5", "C10"]
    },
    {
      id: "fix-6",
      title: "Data Model & Validation Rules",
      priority: "P0",
      owner: "Data Eng",
      blocking: true,
      effort: "M",
      impact: "High",
      description: "Rewrite: Full schema for user_rewards, streaks, playlist_tokens with field types, constraints, TTLs; deterministic streak reset logic; duplicate-grant prevention.",
      steps: [
        "Create full database schema with field types",
        "Define constraints and TTLs",
        "Specify streak reset logic deterministically",
        "Add duplicate-grant prevention mechanism"
      ],
      acceptance_tests: [
        "Migration scripts complete",
        "Invariants checks (no overlapping tokens; max 1 trial/30d)"
      ],
      linked_criteria: ["C5", "C10"]
    },
    {
      id: "fix-7",
      title: "Privacy/Consent & Abuse Controls",
      priority: "P0",
      owner: "Legal + Security",
      blocking: true,
      effort: "M",
      impact: "High",
      description: "Rewrite: Consent UX copy; opt-in storage; location granularity; retention; spoofing detection; geo-fencing.",
      steps: [
        "Draft consent UX copy for location features",
        "Define opt-in storage mechanism",
        "Specify location granularity (city-level vs precise)",
        "Set data retention policies",
        "Add spoofing detection logic",
        "Implement geo-fencing boundaries"
      ],
      acceptance_tests: [
        "Privacy review passes",
        "Location features degrade gracefully when denied"
      ],
      linked_criteria: ["C5", "C10"]
    },
    {
      id: "fix-8",
      title: "Measurement Plan with Targets",
      priority: "P0",
      owner: "Analytics",
      blocking: true,
      effort: "S",
      impact: "High",
      description: "Rewrite: 'Success = +12% p50 TSL and −18% 7-day bounce in target cohort within 8 weeks; guardrail = premium conversion not ↓.'",
      steps: [
        "Set specific numeric targets (+12% TSL, -18% bounce)",
        "Define target cohort precisely",
        "Set time horizon (8 weeks)",
        "Add guardrail metrics (premium conversion)"
      ],
      acceptance_tests: [
        "Dashboard with cohort definitions",
        "Target lines visible",
        "Power analysis documented"
      ],
      linked_criteria: ["C7"]
    },
    {
      id: "fix-9",
      title: "Error/Edge UX Spec to Acceptance Criteria",
      priority: "P1",
      owner: "Design",
      blocking: false,
      effort: "S",
      impact: "Med",
      description: "Rewrite: For each failure (pp.8–9), define exact copy, retry timing, and state transitions.",
      steps: [
        "List all error scenarios from pp.8-9",
        "Write exact error copy for each",
        "Define retry timing and logic",
        "Map state transitions (error → retry → success/fail)"
      ],
      acceptance_tests: [
        "Figma spec with state map",
        "Copy reviewed and approved"
      ],
      linked_criteria: ["C6", "C10"]
    },
    {
      id: "fix-10",
      title: "Template & Structure Clean-up",
      priority: "P2",
      owner: "PM",
      blocking: false,
      effort: "S",
      impact: "Low",
      description: "Rewrite: Adopt rubric's PRD order and formatting; move all diagrams to Appendix with figure refs.",
      steps: [
        "Reorder sections to match template",
        "Move diagrams to Appendix",
        "Add figure references in main text",
        "Standardize formatting (consistent headings, bullets)"
      ],
      acceptance_tests: [
        "Lint against template passes",
        "Figure captions added"
      ],
      linked_criteria: ["C8"]
    }
  ]
};

export const spotifyAgentTasks: AgentTasksOutput = {
  tasks: [
    {
      id: "task-1",
      feature: "F1: Progress Tracking",
      title: "Define Daily Progress Counter",
      description: "Create counter that tracks daily playback progress for eligibility determination, handling timezone rollovers and out-of-order events.",
      duration: "2h",
      est_hours: 2,
      owner_role: "Backend Engineer",
      entry: "Event schema validated; timezone resolved",
      exit: "Counter updates idempotently per event",
      test: "Aggregation matches ground truth on 50 sessions; handles cross-day rollover",
      entry_conditions: [
        "Event schema validated",
        "Timezone resolved"
      ],
      exit_conditions: [
        "Counter updates idempotently per event"
      ],
      tests: [
        "Aggregation matches ground truth on 50 sessions",
        "Handles cross-day rollover"
      ],
      inputs: [
        "user_id",
        "playback events (start/stop, ms_played, device_id)"
      ],
      outputs: [
        "daily_ms_listened",
        "eligible_state"
      ],
      status: "ready"
    },
    {
      id: "task-2",
      feature: "F1: Progress Tracking",
      title: "Streak Engine",
      description: "Implement streak calculation logic that determines consecutive days meeting 90m threshold, with DST and timezone change handling.",
      duration: "3h",
      est_hours: 3,
      owner_role: "Backend Engineer",
      entry: "Daily progress counter operational",
      exit: "Streak calculations pass all boundary tests",
      test: "Boundary at 89m59s vs 90m00s; DST, travel (tz change)",
      entry_conditions: [
        "Daily progress counter operational"
      ],
      exit_conditions: [
        "Streak calculations pass all boundary tests"
      ],
      tests: [
        "Boundary at 89m59s vs 90m00s",
        "DST transitions handled correctly",
        "Travel timezone changes work"
      ],
      inputs: [
        "daily_ms_listened"
      ],
      outputs: [
        "current_streak",
        "last_met_at",
        "streak_break_reason"
      ],
      status: "blocked"
    },
    {
      id: "task-3",
      feature: "F2: Reward Grant",
      title: "Reward Grant Service",
      description: "Service to grant playlist tokens and premium trials with idempotency, cooldown enforcement, and audit logging.",
      duration: "3h",
      est_hours: 3,
      owner_role: "Backend Engineer",
      entry: "Eligibility = true; cooldown not active",
      exit: "Exactly one grant/period; append audit log",
      test: "Duplicate-grant prevention; token TTL respected",
      entry_conditions: [
        "Eligibility = true",
        "Cooldown not active"
      ],
      exit_conditions: [
        "Exactly one grant per period",
        "Audit log appended"
      ],
      tests: [
        "Duplicate-grant prevention works",
        "Token TTL respected"
      ],
      inputs: [
        "eligible_state",
        "current_streak"
      ],
      outputs: [
        "playlist_token{token_id, expires_at}",
        "trial_grant{starts_at, ends_at}"
      ],
      status: "blocked"
    },
    {
      id: "task-4",
      feature: "F2: Reward Grant",
      title: "Playlist Token Validation API",
      description: "API endpoint to validate playlist access tokens with proper error codes for expired/used/invalid tokens.",
      duration: "3h",
      est_hours: 3,
      owner_role: "Backend Engineer",
      entry: "Token grant service operational",
      exit: "API returns correct status codes for all scenarios",
      test: "p95 read ≤300ms; 0% unauth access in fuzz test",
      entry_conditions: [
        "Token grant service operational"
      ],
      exit_conditions: [
        "API returns correct status codes for all scenarios"
      ],
      tests: [
        "p95 read ≤300ms",
        "0% unauthorized access in fuzz test"
      ],
      inputs: [
        "token_id",
        "user_id",
        "device_id"
      ],
      outputs: [
        "access_granted:boolean",
        "playlist_ids[]"
      ],
      status: "blocked"
    },
    {
      id: "task-5",
      feature: "F3: Premium Trial",
      title: "Premium Trial Switcher",
      description: "Switch user entitlement to trial status for 24h after 7-day streak, then revert with metrics emission.",
      duration: "3h",
      est_hours: 3,
      owner_role: "Backend Engineer",
      entry: "7-day streak achieved; cooldown OK",
      exit: "Trial active for 24h; reverts to FREE; metrics emitted",
      test: "Reversion at boundary; multiple devices consistent",
      entry_conditions: [
        "7-day streak achieved",
        "Cooldown OK"
      ],
      exit_conditions: [
        "Trial active for 24h",
        "Reverts to FREE",
        "Metrics emitted"
      ],
      tests: [
        "Reversion at 24h boundary",
        "Multiple devices show consistent state"
      ],
      inputs: [
        "trial_grant"
      ],
      outputs: [
        "entitlement_state: FREE|TRIAL|PREMIUM"
      ],
      status: "blocked"
    },
    {
      id: "task-6",
      feature: "F4: Fraud Prevention",
      title: "Fraud/Abuse Guards",
      description: "Detect and prevent progress fraud via concurrent device detection and mute/volume analysis.",
      duration: "3h",
      est_hours: 3,
      owner_role: "Backend Engineer + Security",
      entry: "Device fingerprinting available",
      exit: "Abuse detection active with <1% false positives",
      test: "Simulate abuse patterns; false positive rate <1%",
      entry_conditions: [
        "Device fingerprinting available"
      ],
      exit_conditions: [
        "Abuse detection active",
        "False positive rate <1%"
      ],
      tests: [
        "Simulate abuse patterns",
        "Measure false positive rate <1%"
      ],
      inputs: [
        "device fingerprints",
        "concurrent plays",
        "volume/mute flags"
      ],
      outputs: [
        "abuse_detected:boolean",
        "rejection_reason"
      ],
      status: "ready"
    },
    {
      id: "task-7",
      feature: "F5: Client UI",
      title: "Client Progress UI + State Machine",
      description: "Build progress bar, unlock CTA, and cooldown badge UI with state machine covering all states.",
      duration: "3h",
      est_hours: 3,
      owner_role: "Frontend Engineer",
      entry: "Authenticated free-tier user, target cohort",
      exit: "All states reachable: Not-started/In-progress/Unlocked/Expired",
      test: "Snapshot tests of all states; RTL test for a11y labels",
      entry_conditions: [
        "Authenticated free-tier user",
        "Target cohort verified"
      ],
      exit_conditions: [
        "All states reachable: Not-started/In-progress/Unlocked/Expired"
      ],
      tests: [
        "Snapshot tests of all states",
        "RTL test for a11y labels"
      ],
      inputs: [
        "eligible_state",
        "current_streak"
      ],
      outputs: [
        "Progress bar component",
        "Unlock CTA",
        "Cooldown badge"
      ],
      status: "blocked"
    },
    {
      id: "task-8",
      feature: "F6: Analytics",
      title: "Analytics & Dashboards",
      description: "Implement event tracking for all reward system interactions with completeness monitoring.",
      duration: "3h",
      est_hours: 3,
      owner_role: "Data Engineer",
      entry: "Event schema defined",
      exit: "All events tracked with >99% daily completeness",
      test: "Event schema validation; daily completeness >99%",
      entry_conditions: [
        "Event schema defined"
      ],
      exit_conditions: [
        "All events tracked",
        "Daily completeness >99%"
      ],
      tests: [
        "Event schema validation passes",
        "Daily completeness >99%"
      ],
      inputs: [
        "progress_deltas",
        "user_actions"
      ],
      outputs: [
        "SessionStart/End events",
        "StreakProgress events",
        "RewardGranted events",
        "PlaylistOpened events",
        "TrialStarted events",
        "Conversion events"
      ],
      status: "ready"
    },
    {
      id: "task-9",
      feature: "F7: Notifications",
      title: "Comms/Notifications",
      description: "Send timely notifications for progress milestones, unlocks, and weekly congratulations.",
      duration: "2h",
      est_hours: 2,
      owner_role: "Backend Engineer",
      entry: "Notification service configured",
      exit: "Delivery <5s p95; opt-out honored",
      test: "Delivery <5s p95; opt-out honored",
      entry_conditions: [
        "Notification service configured"
      ],
      exit_conditions: [
        "Delivery <5s p95",
        "Opt-out honored"
      ],
      tests: [
        "Delivery latency <5s p95",
        "Opt-out preferences respected"
      ],
      inputs: [
        "progress deltas"
      ],
      outputs: [
        "Nudge at T–20m",
        "Unlock toast ≤2s after eligibility",
        "Weekly congrats message"
      ],
      status: "blocked"
    },
    {
      id: "task-10",
      feature: "F8: Operations",
      title: "Runbook & Alerts",
      description: "Set up monitoring, alerts, and runbooks for reward system operations.",
      duration: "2h",
      est_hours: 2,
      owner_role: "SRE",
      entry: "Services deployed to staging",
      exit: "Monitors active; runbooks documented",
      test: "Alert fires on simulated error rate >0.5%",
      entry_conditions: [
        "Services deployed to staging"
      ],
      exit_conditions: [
        "Monitors active",
        "Runbooks documented"
      ],
      tests: [
        "Alert fires on simulated error rate >0.5%",
        "Token validation p95>500ms triggers alert"
      ],
      inputs: [
        "Service metrics",
        "Error logs"
      ],
      outputs: [
        "Monitors for grant error rate >0.5%",
        "Monitors for token validation p95>500ms",
        "Retry procedures playbook",
        "Grace grant playbook"
      ],
      status: "blocked"
    }
  ],
  edges: [
    {
      from: "task-1",
      to: "task-2",
      type: "depends_on"
    },
    {
      from: "task-2",
      to: "task-3",
      type: "depends_on"
    },
    {
      from: "task-3",
      to: "task-4",
      type: "depends_on"
    },
    {
      from: "task-3",
      to: "task-5",
      type: "depends_on"
    },
    {
      from: "task-3",
      to: "task-7",
      type: "depends_on"
    },
    {
      from: "task-1",
      to: "task-8",
      type: "related"
    },
    {
      from: "task-2",
      to: "task-9",
      type: "depends_on"
    }
  ],
  mermaid: ""
};

