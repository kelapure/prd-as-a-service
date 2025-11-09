// Complete rubric definitions extracted from "Copy of PRD LLM-as-judge Eval (PUBLIC).md"
// This provides the same detailed context that the custom GPT has access to

export interface CriterionDefinition {
  name: string;
  definition: string;
  passCriteria: string[];
  failIndicators: string[];
  examplePass: string;
  exampleFail: string;
}

export const CRITERION_DEFINITIONS: Record<string, CriterionDefinition> = {
  C1: {
    name: "Business Problem Clarity and Justification",
    definition: "The Business Problem section clearly defines the current problem, quantifies business impact, identifies specific pain points, and concludes with how the solution addresses these challenges.",
    passCriteria: [
      "State the specific inefficiencies or limitations in the current process",
      "Identifies concrete pain points experienced by end users",
      "Quantifies business impact (operational costs, delays, or missed opportunities)",
      "Connects operational issues directly to business outcomes",
      "Concludes with a clear statement of how the solution addresses these challenges",
      "Avoids vague or generic problem statements"
    ],
    failIndicators: [
      "Generic problem descriptions like 'process is inefficient' without specifics",
      "No quantified business impact",
      "Cannot identify which users experience which pain points",
      "Solution disconnected from stated problems",
      "Speculative or assumed problems without evidence"
    ],
    examplePass: "Customer service representatives currently spend 45 minutes per claim manually cross-referencing data across three systems (Brightree, internal Excel trackers, and email). This results in an average processing time of 2.5 hours per claim and causes $200K in annual overtime costs. Representatives report frustration with system fragmentation and data re-entry. Unified dashboard will eliminate manual cross-referencing by consolidating data access into a single interface.",
    exampleFail: "The current claims process is slow and needs improvement. Our solution will make things faster."
  },

  C2: {
    name: "Current Process Documentation Completeness",
    definition: "The Current Process section provides comprehensive documentation of existing workflows through clear, detailed descriptions in visual forms (flowcharts, process maps, value stream maps), narrative descriptions, or both. It identifies all systems, user interactions, fragmentation points, and integration gaps.",
    passCriteria: [
      "Documents the current process with sufficient clarity for readers to understand the existing workflow (visual, narrative, or both formats acceptable)",
      "Documents specific procedural steps users follow today",
      "Identifies all systems currently in use and how users interact with each",
      "Specifies where process fragmentation occurs",
      "Catalogs integration gaps between existing platforms",
      "Identifies data quality issues, manual tracking methods, and reporting limitations",
      "Documents all affected user roles and their current pain points",
      "Quantifies inefficiencies (time, cost, error rates)"
    ],
    failIndicators: [
      "Vague descriptions like 'users enter data into systems' without specifics",
      "Missing system names or integration points",
      "No identification of where the process breaks down",
      "Cannot determine the current state baseline for comparison",
      "User roles not identified or pain points not documented",
      "Insufficient detail to understand the existing workflow, regardless of format"
    ],
    examplePass: "[Includes value stream map showing five handoffs AND/OR detailed narrative] Customer service representatives begin by receiving claim forms via email (System: Outlook). They manually extract 15 data fields and enter them into Brightree (5-7 minutes per claim). Next, they cross-reference patient eligibility in a separate Excel tracker maintained by billing (System: Shared Drive, updated weekly). If discrepancies exist, representatives email the billing team (average 24-hour turnaround) before proceeding. This fragmentation causes a 2-day delay in 30% of claims.",
    exampleFail: "Users currently process claims manually across multiple systems, which is time-consuming."
  },

  C3: {
    name: "Solution-Problem Alignment",
    definition: "The Product Description clearly explains how the product addresses the business problem and improves the current process. Each feature is traceable to a limitation identified in the Current Process section.",
    passCriteria: [
      "Product description explicitly references problems from the Business Problem section",
      "Each major feature addresses a specific limitation from the Current Process section",
      "Clear explanation of how the product improves the current workflow",
      "Objectives use action-oriented verbs (Launch, Improve, Reduce, Increase)",
      "Objectives are measurable and time-bound (Key Results included)",
      "No features that don't solve stated problems"
    ],
    failIndicators: [
      "Features appear without connection to stated problems",
      "Product description reads like a wishlist rather than a targeted solution",
      "Cannot trace features back to current process limitations",
      "Objectives are vague or unmeasurable",
      "Scope creep evident (features beyond the stated problem space)"
    ],
    examplePass: "To eliminate the 45-minute manual cross-referencing burden identified in Section 2, the unified dashboard will automatically retrieve and display claim data from all three systems (Brightree, billing tracker, and email) in a single interface. This addresses the data fragmentation pain point, causing $200K in annual overtime costs.",
    exampleFail: "The system will include a modern dashboard with analytics and reporting capabilities."
  },

  C4: {
    name: "Narrative Clarity and Plain Language",
    definition: "The PRD uses clear, plain English throughout, avoiding fluffy language, corporate jargon, and unnecessary complexity. Technical concepts are explained precisely without ambiguity.",
    passCriteria: [
      "Uses active voice throughout",
      "States exactly what happens without vague descriptors",
      "Defines all acronyms on first use",
      "Avoids weasel words and ambiguous phrasing",
      "Technical constraints and business rules are stated explicitly",
      "Uses adverbs sparingly, adjectives only when substantiated",
      "Narrative style with full-formed statements (not bullet points in core sections)"
    ],
    failIndicators: [
      "Passive voice dominates",
      "Corporate jargon ('synergize,' 'leverage,' 'holistic solution')",
      "Fluffy or vague language ('robust,' 'scalable,' 'best-in-class' without definition)",
      "Unexplained acronyms",
      "Ambiguous terms that could be interpreted in multiple ways",
      "Excessive bullet points hide a lack of specificity"
    ],
    examplePass: "When a representative clicks 'Validate Claim,' the system executes three checks in sequence: (1) patient eligibility verification against the billing database, (2) coverage limit validation against plan details, (3) duplicate claim detection by comparing claim ID and date. If any check fails, the system displays a specific error message and prevents claim submission.",
    exampleFail: "The system will leverage advanced algorithms to validate claims holistically, providing robust error handling and best-in-class user experience."
  },

  C5: {
    name: "Completeness of Technical Requirements",
    definition: "The Technical Requirements section defines all external system dependencies, integration patterns (read-only, write-only, bi-directional), data validation rules, error handling, API specifications, compliance requirements, and edge case behaviors.",
    passCriteria: [
      "All external system integrations are identified by name",
      "Integration direction specified (read-only, write-only, bi-directional) with justification",
      "Data validation rules documented with specific examples",
      "Error-handling procedures are detailed for each integration point",
      "Behavior defined for integration unavailability scenarios",
      "API endpoints, authentication methods, and data formats are specified",
      "Compliance and regulatory requirements listed (HIPAA, etc.)",
      "Performance, scalability, and security requirements stated",
      "Data fields include types, validation rules, and default values"
    ],
    failIndicators: [
      "'The system will integrate with third-party APIs' without specifics",
      "No mention of what happens when integrations fail",
      "Missing data validation rules",
      "No compliance or regulatory requirements mentioned when applicable",
      "Vague performance requirements ('must be fast')",
      "Integration direction not specified"
    ],
    examplePass: "The system requires read-only integration with Brightree API v2.3 to retrieve claim status. Integration will use OAuth 2.0 authentication with refresh tokens valid for 60 days. If Brightree API returns HTTP 500 or times out after 10 seconds, the system will display 'Claim status unavailable - retry in 5 minutes' and log the error for manual review. The claim_id field must be a 12-character alphanumeric string matching regex ^[A-Z0-9]{12}$ with no default value.",
    exampleFail: "The system will integrate with Brightree to get claim data."
  },

  C6: {
    name: "Feature Specificity and Implementation Clarity",
    definition: "The Product Features section provides detailed descriptions of each feature with clear boundaries, specific user interactions, workflow logic, exception handling, and explicit acceptance criteria.",
    passCriteria: [
      "Each feature has a clear, descriptive name",
      "Functionality and purpose are described in detail",
      "User interactions are specified step-by-step",
      "Workflow rules and business logic documented",
      "Exception handling and edge cases addressed",
      "Human-in-the-loop checkpoints identified",
      "Features specify how they work together",
      "Technical requirements or constraints stated",
      "Process maps show reworked workflows with efficiency gains identified"
    ],
    failIndicators: [
      "Feature descriptions are high-level overviews",
      "'The system will allow users to [action]' without explaining how",
      "No mention of edge cases or error states",
      "Unclear what happens when rules are violated",
      "Cannot determine from the description how to implement the feature",
      "No workflow diagrams for complex multi-step features"
    ],
    examplePass: "Feature: Automated Eligibility Verification. When a representative enters a patient ID and clicks 'Check Eligibility,' the system sends a GET request to the billing database API with patient_id and claim_date parameters. Within 2 seconds, the system displays one of three states: (1) 'Eligible - Coverage Valid' if active coverage is found, (2) 'Not Eligible - Coverage Expired on [date]' if coverage lapsed, or (3) 'Cannot Verify - Contact Billing' if API returns error or patient not found. Representatives can override 'Cannot Verify' status by clicking 'Manual Review' and adding a justification note (required, minimum 20 characters), which triggers a notification to the billing team.",
    exampleFail: "Feature: Eligibility Checking. The system will verify patient eligibility automatically."
  },

  C7: {
    name: "Measurability and Success Criteria",
    definition: "The Measurement section defines specific, software-derived metrics with clear acceptance conditions for production deployment, including quality metrics, data collection methods, and evaluation plans.",
    passCriteria: [
      "Metrics derived explicitly from software capabilities (not external factors)",
      "Acceptance conditions for production deployment are clearly stated",
      "Quality metrics include quantity, quality, and tracking method",
      "Data collection process documented (what, how, when, who)",
      "For LLM-based features: inference cost estimates, latency targets, accuracy thresholds",
      "Spot check methodology and issue categorization process defined",
      "Metrics are measurable within the software itself"
    ],
    failIndicators: [
      "Metrics dependent on user behavior outside the software's control",
      "'Success will be measured by user satisfaction,' without defining how",
      "No acceptance criteria for deployment",
      "LLM features without cost/latency/accuracy tradeoff analysis",
      "Cannot determine from the PRD how to measure if the software is working",
      "Vague metrics ('improved efficiency') without specific measurement"
    ],
    examplePass: "Acceptance Criterion: System must complete eligibility verification within 2 seconds for 95% of requests, measured by monitoring API response times in production logs. Quality metric: Automated eligibility determination must match manual billing team verification in 98% of cases, measured through weekly random sampling of 50 claims with human review. Data collection: System logs timestamp of eligibility check start and API response receipt; exports to DataDog dashboard with p95 latency alert threshold set at 2.5 seconds.",
    exampleFail: "The system will improve claim processing efficiency and increase user satisfaction. Success will be measured by reduced processing times."
  },

  C8: {
    name: "Consistent Formatting and Structure",
    definition: "The PRD follows the template structure exactly, maintains consistent formatting for similar items throughout, and includes all required sections with appropriate content.",
    passCriteria: [
      "Follows the PRD template section order precisely",
      "All required sections present (Business Problem, Current Process, Product Description, Product Features, Technical Requirements, Measurement, Appendix)",
      "Consistent formatting within each section type",
      "Narrative style maintained (no bullet point abuse)",
      "Visual elements (diagrams, tables, charts), if included, should be placed in the Appendix with references in the main text or embedded inline if they clarify complex workflows",
      "Acronyms defined in the Appendix",
      "Stakeholder section completed with names, roles, and responsibilities"
    ],
    failIndicators: [
      "Sections out of order or missing",
      "Inconsistent formatting (e.g., some features as paragraphs, others as bullets)",
      "Diagrams are scattered throughout the main document",
      "No Appendix or incomplete Appendix",
      "Switching between narrative and bullet styles arbitrarily"
    ],
    examplePass: "[PRD follows exact template order: Business Problem → Current Process → Product Description → Product Features → Technical Requirements → Measurement → Appendix. All features are formatted as narrative paragraphs with a consistent structure. All diagrams in the Appendix with Figure references in the main text.]",
    exampleFail: "[PRD has sections in random order, switches between bullets and paragraphs, diagrams scattered throughout, and no Appendix]"
  },

  C9: {
    name: "Scope, Discipline, and Anti-Explosion",
    definition: "The PRD maintains tight scope boundaries, with every feature directly solving a stated problem and no speculative or 'nice-to-have' additions. The Business Problem section guides all subsequent sections. Note: While Criterion 3 evaluates whether documented features align with stated problems (forward tracing), Criterion 9 assesses whether the PRD contains ONLY problem-aligned features (scope boundary enforcement).",
    passCriteria: [
      "Every feature traces back to a Business Problem or a Current Process limitation",
      "No features appear that solve unstated problems",
      "Product Description scope aligns precisely with stated objectives",
      "Sequential section development is evident (each section builds on the previous)",
      "No speculative features or future possibilities included",
      "PRD describes what WILL be built, not what MIGHT be built",
      "Generative AI didn't add unnecessary complexity"
    ],
    failIndicators: [
      "Features solving problems not mentioned in the Business Problem section",
      "'This could also...' or 'Future versions might...' language",
      "The scope is significantly larger than the problems warrant",
      "Features included 'just because we can'",
      "Objectives don't align with the business problem",
      "Evidence of unchecked LLM-generated scope explosion"
    ],
    examplePass: "[Business Problem identifies three specific pain points. The Product Features section includes three features, each mapping 1:1 to a pain point. No additional features suggested.]",
    exampleFail: "[Business Problem identifies three pain points. Product Features section includes 10 features, many solving problems never mentioned in the Business Problem section, with phrases like 'could eventually enable' and 'may also provide value for']"
  },

  C10: {
    name: "Implementability and Engineering Readiness",
    definition: "An engineer and designer reading this PRD can build the product without questions about product requirements, business logic, or user workflows. Core implementation details are specified, though external system documentation (e.g., third-party API specs) may be referenced rather than duplicated. 'Implementability' assumes engineers have access to standard external resources (API documentation, system schemas, infrastructure specs). The PRD should specify WHICH external systems to integrate with and HOW to use them (authentication, endpoints, data flows), but need not duplicate complete API documentation within the PRD itself.",
    passCriteria: [
      "User stories follow a consistent format with explicit acceptance criteria",
      "Business logic rules and formulas are stated in plain language",
      "Edge cases and error conditions documented for all features",
      "External system integrations are clearly identified with sufficient detail for engineers to locate and use the relevant API documentation",
      "No ambiguity about what 'done' means for any feature",
      "A designer can create mockups from feature descriptions alone",
      "An engineer can write code from technical requirements alone, given access to standard external documentation",
      "All prerequisites and dependencies identified"
    ],
    failIndicators: [
      "'The system should be intuitive,' without defining what that means",
      "Acceptance criteria missing or vague ('works well')",
      "Edge cases not addressed",
      "An engineer would need to make product or business logic assumptions to implement",
      "Integrations mentioned without specifying which APIs, endpoints, or authentication methods",
      "Cannot determine 'done' state from PRD alone",
      "Too high-level to estimate or implement"
    ],
    examplePass: "User Story 1.2: Display Eligibility Status. Acceptance Criteria: System displays 'Eligible - Coverage Valid' in green 14pt bold text when API returns status=active. System displays 'Not Eligible - Coverage Expired on [expiration_date]' in red 14pt bold text when API returns status=expired, replacing [expiration_date] with the value from coverage_end field formatted as MM/DD/YYYY. System displays 'Cannot Verify - Contact Billing' in yellow 14pt bold text when API returns HTTP 500, 503, 404, or times out after 10 seconds. Status message appears in the top-right panel directly below the patient name within 100ms of API response receipt. Override button labeled 'Manual Review' appears below status message only when status is 'Cannot Verify'. Edge Cases: If the API returns malformed JSON, treat it as a 'Cannot Verify' state. If the patient has multiple active coverages, display coverage with the latest start date. If coverage_end field is null: treat as active coverage with no expiration.",
    exampleFail: "User Story: The system should clearly show users' eligibility status. Acceptance Criteria: Status is displayed appropriately."
  },

  C11: {
    name: "AI Agent Task Decomposability",
    definition: "The PRD provides sufficient detail and structure to enable AI agents to autonomously generate discrete, executable tasks with clear boundaries, tests, dependencies, and completion criteria. Features are described with enough granularity that automated systems can break them into implementable work units without human interpretation.",
    passCriteria: [
      "Complex features are broken into sub-features with clear handoff points and intermediate deliverables",
      "Each feature includes explicit user workflows that can be translated into discrete tasks",
      "Business logic rules are stated as statements that agents can parse",
      "Data transformations and validation rules are specified with input/output formats",
      "Integration points specify exact API calls, parameters, and expected responses",
      "Error conditions include specific system behaviors and user-facing messages",
      "Feature boundaries are clearly defined with explicit entry and exit points",
      "Dependencies between features are explicitly stated with sequencing requirements",
      "Acceptance criteria use measurable, testable conditions that agents can verify",
      "Technical constraints include performance thresholds and resource limits",
      "Each feature can be implemented independently or with clearly identified prerequisites",
      "Task granularity enables decomposition into work units that are completable within 2-4 hours by an AI agent"
    ],
    failIndicators: [
      "Features described at a high conceptual level requiring human interpretation and back-and-forth dialogue with the domain expert",
      "Business logic is stated as general principles rather than specific rules",
      "'The system should be intuitive,' without defining specific behaviors",
      "Integration requirements that need human judgment to implement",
      "Acceptance criteria that require subjective evaluation",
      "Features with unclear boundaries that could overlap in implementation",
      "Missing dependency information between related features",
      "Vague error handling that doesn't specify exact system responses",
      "Performance requirements stated as 'fast' or 'responsive' without metrics",
      "Features that cannot be broken into discrete, testable work units",
      "Features so large that they would require more than two agent days of development work without clear sub-task boundaries",
      "Complex workflows are described as single features without intermediate checkpoints or deliverable milestones"
    ],
    examplePass: "Feature 2.3: Eligibility Status Display. When user clicks 'Check Eligibility' button, system executes GET request to /api/eligibility/{patient_id} with Authorization header containing valid JWT token. If API returns HTTP 200 with status='active', display 'Eligible - Coverage Valid' in green text (hex #00AA00) in eligibility-status div. If API returns HTTP 200 with status='expired', display 'Not Eligible - Coverage Expired on {coverage_end_date}' in red text (hex #FF0000), formatting date as MM/DD/YYYY. If API returns HTTP 404, 500, or times out after 10 seconds, display 'Cannot Verify - Contact Billing' in yellow text (hex #FFAA00) and enable 'Manual Override' button. All status changes must complete within 2 seconds and trigger eligibility-changed event for downstream components.",
    exampleFail: "Feature: Eligibility Verification. The system should provide clear, user-friendly eligibility checking that integrates smoothly with existing workflows and handles edge cases appropriately."
  }
};

// Reference examples from Appendix B showing concrete PASS and FAIL cases
export const EVALUATION_EXAMPLES = `
# Reference Evaluation Examples

## Strong PASS Examples

### WestREC PRD (Renewable Energy Certificate Platform)
**C1 - Business Problem Clarity**: PASS
"Laboratory technicians spend 30 minutes per sample manually transcribing assay results from equipment readouts into LIMS, resulting in a 15% data entry error rate and $500K annual rework costs..."
- Specific problem (30 min/sample transcription)
- Quantified impact (15% error rate, $500K costs)
- Clear pain points (manual transcription)

**C5 - Technical Requirements**: PASS
"System integrates with Brightree API v2.3 (documentation: https://api.brightree.com/docs) using OAuth 2.0. Required endpoints: GET /claims/{id} for retrieval, POST /claims for submission. Authentication tokens expire after 60 minutes. When API returns HTTP 429 (rate limit), wait 60 seconds before retry..."
- Specific API version and documentation link
- Authentication method (OAuth 2.0)
- Exact endpoints needed
- Error handling procedures
- Timeout and retry logic

**C11 - AI Agent Task Decomposability**: PASS
"Feature 6.8: Feasibility Checks. The system uses Capacity Factors or Max Annuals on registrations to determine whether an uploaded value is reasonable based on registration information and time period..."

AI Agent could autonomously generate:
Task 1 (2h): Create database schema for Capacity Factor storage
- Input: Registration table structure
- Output: capacity_factors table with fields (registration_id, capacity_factor_value, max_annual_value, effective_date)
- Test: Table created with proper foreign keys, constraints, and indexes
- Dependencies: None (foundational task)

Task 2 (3h): Implement feasibility validation logic
- Input: Uploaded generation value, registration information, time period
- Output: Boolean (passes_feasibility) + reason_code if failed
- Business rule: IF uploaded_value > (capacity_factor × time_period) THEN fails_feasibility = TRUE
- Test: Unit tests with boundary values (at threshold, 1 below, 1 above, 100x above)
- Dependencies: Task 1 complete

## Clear FAIL Examples

### Spring Health PRD (Clinical Documentation Assistant)
**C5 - Technical Requirements**: FAIL
"The 360View requires seamless integration with Spring Health's existing clinical systems... The system will establish read-only API access to Spring Health Assistant to retrieve patient profiles... Similarly, integration with Athena EMR as the primary clinical documentation system will enable extraction of detailed clinical history..."
❌ No API endpoints specified
❌ No authentication method
❌ No error handling (what if Athena EMR is down?)
❌ States "API access requirements and integration specifications will be documented in the technical design" - deferring critical requirements

**C11 - AI Agent Task Decomposability**: FAIL
"Feature 3: Intelligent Recommended Question List. The recommendation engine combines the patient's clinical history gathered during pre-visit analysis with real-time conversation transcription to create a dynamically updated list of targeted questions..."

AI Agent Decomposition Attempt - encounters blockers:
❌ Blocker 1: HOW does it "combine"? String concatenation? Vector embeddings? LLM context window? Structured merge?
❌ Blocker 2: What fields from clinical history? All 200+ EMR fields? Specific subset? Which sections?
❌ Blocker 3: What format is transcription in? Raw text string? JSON with speaker labels? Timestamped segments?
❌ Blocker 4: When does combining occur? Real-time streaming? Batch every 30 seconds? On-demand?

The phrase "will be specified in technical requirements following PRD approval" means the agent must wait for future documentation - cannot generate executable tasks from current PRD.

### Apex Health PRD (Research Data Platform)
**C9 - Scope Discipline**: FAIL
Business Problem identifies: fragmented workflows, manual Excel processes, disconnected tools, lack of traceability.

Product Features include the expected solutions PLUS massive scope explosion:
- Complete 23-object Ontology system
- Multiple platform adapters for 5+ instrument types
- XML Protocol Version Control System
- Queryable experiment model with SQL layer
- EAV variable store architecture
- Metrics registry with formula catalog
- JMP export integration
- Git workflow internalization

Evidence of unchecked technical architecture expansion beyond stated business problems.
`.trim();

// Failure mode taxonomy for additional context
export const FAILURE_MODE_TAXONOMY = `
# Common PRD Failure Patterns

1. Generic Problem Statements: "Process is inefficient" without specifics
2. Missing Quantification: No cost, time, or error rate data
3. Assumed Context: Writer assumes the reader knows unstated information
4. Scope Explosion: Features beyond the stated problem space
5. Jargon Overload: Corporate speak obscuring meaning
6. Visual-Narrative Gap: Diagrams contradict text descriptions
7. Feature-Problem Disconnect: Cannot trace the feature to the stated problem
8. Vague Acceptance Criteria: "Works well" instead of specific conditions
9. Missing Edge Cases: Happy path only, no error handling
10. Integration Hand-Waving: "Will integrate with X" without details
11. External Documentation Confusion: PRD either duplicates the entire API documentation unnecessarily OR fails to specify which external systems and endpoints to use
`.trim();

