# **LLM-as-judge Eval for all PRDs** Last Updated: Oct 12, 2025

[Overview	1](#overview)

[The 11-Point PRD Evaluation Rubric	2](#the-11-point-prd-evaluation-rubric)

[1\. Business Problem Clarity and Justification	2](#1.-business-problem-clarity-and-justification)

[2\. Current Process Documentation Completeness	3](#2.-current-process-documentation-completeness)

[3\. Solution-Problem Alignment	4](#3.-solution-problem-alignment)

[4\. Narrative Clarity and Plain Language	5](#4.-narrative-clarity-and-plain-language)

[5\. Completeness of Technical Requirements	6](#5.-completeness-of-technical-requirements)

[6\. Feature Specificity and Implementation Clarity	6](#6.-feature-specificity-and-implementation-clarity)

[7\. Measurability and Success Criteria	8](#7.-measurability-and-success-criteria)

[8\. Consistent Formatting and Structure	8](#8.-consistent-formatting-and-structure)

[9\. Scope, Discipline, and Anti-Explosion	9](#9.-scope,-discipline,-and-anti-explosion)

[10\. Implementability and Engineering Readiness	10](#10.-implementability-and-engineering-readiness)

[11\. AI Agent Task Decomposability	12](#11.-ai-agent-task-decomposability)

[Implementation Guidelines	13](#implementation-guidelines)

[For Evaluators	13](#for-evaluators)

[For PRD Authors	14](#for-prd-authors)

[Appendix A: Scoring Sheet Template	14](#appendix-a:-scoring-sheet-template)

[Appendix B: Example Evaluation Session	15](#appendix-b:-example-evaluation-session)

[Criterion 1: Business Problem Clarity	15](#criterion-1:-business-problem-clarity)

[Criterion 2: Current Process Documentation	15](#criterion-2:-current-process-documentation)

[Criterion 3: Solution-Problem Alignment	15](#criterion-3:-solution-problem-alignment)

[Criterion 4: Narrative Clarity and Plain Language	16](#criterion-4:-narrative-clarity-and-plain-language)

[Criterion 5: Completeness of Technical Requirements	17](#criterion-5:-completeness-of-technical-requirements)

[Criterion 6: Feature Specificity and Implementation Clarity	18](#criterion-6:-feature-specificity-and-implementation-clarity)

[Criterion 7: Measurability and Success Criteria	18](#criterion-7:-measurability-and-success-criteria)

[Criterion 8: Consistent Formatting and Structure	19](#criterion-8:-consistent-formatting-and-structure)

[Criterion 9: Scope, Discipline, and Anti-Explosion	20](#criterion-9:-scope,-discipline,-and-anti-explosion)

[Criterion 10: Implementability and Engineering Readiness	21](#criterion-10:-implementability-and-engineering-readiness)

[Criterion 11: AI Agent Task Decomposability	21](#criterion-11:-ai-agent-task-decomposability)

[Appendix C: Failure Mode Taxonomy	24](#appendix-c:-failure-mode-taxonomy)

[Appendix D: Inter-Evaluator Agreement Protocol	24](#appendix-d:-inter-evaluator-agreement-protocol)

[References	24](#references)

## **Overview** {#overview}

This evaluation framework follows best practices from application-centric AI evaluation methodology, including:

* **Binary, reference-free metrics** (avoiding Likert scales for clearer judgments)  
* **Application-specific criteria** grounded in PRD template requirements  
* **Iterative refinement** through the Analyze-Measure-Improve lifecycle  
* **Clear, unambiguous definitions** for each evaluation criterion

---

## **The 11-Point PRD Evaluation Rubric** {#the-11-point-prd-evaluation-rubric}

Each criterion is evaluated as **PASS** or **FAIL** with clear, objective definitions. A high-quality PRD should pass all 10 criteria.

---

### **1\. Business Problem Clarity and Justification** {#1.-business-problem-clarity-and-justification}

**Definition:** The Business Problem section clearly defines the current problem, quantifies business impact, identifies specific pain points, and concludes with how the solution addresses these challenges.

**Pass Criteria:**

* State the specific inefficiencies or limitations in the current process  
* Identifies concrete pain points experienced by end users  
* Quantifies business impact (operational costs, delays, or missed opportunities)  
* Connects operational issues directly to business outcomes  
* Concludes with a clear statement of how the solution addresses these challenges  
* Avoids vague or generic problem statements

**Fail Indicators:**

* Generic problem descriptions like "process is inefficient" without specifics  
* No quantified business impact  
* Cannot identify which users experience which pain points  
* Solution disconnected from stated problems  
* Speculative or assumed problems without evidence

**Example Pass:**

"Customer service representatives currently spend 45 minutes per claim manually cross-referencing data across three systems (Brightree, internal Excel trackers, and email). This results in an average processing time of 2.5 hours per claim and causes $200K in annual overtime costs. Representatives report frustration with system fragmentation and data re-entry. Unified dashboard will eliminate manual cross-referencing by consolidating data access into a single interface."

**Example Fail:**

"The current claims process is slow and needs improvement. Our solution will make things faster."

---

### **2\. Current Process Documentation Completeness** {#2.-current-process-documentation-completeness}

**Definition:** The Current Process section provides comprehensive documentation of existing workflows through clear, detailed descriptions in visual forms (flowcharts, process maps, value stream maps), narrative descriptions, or both. It identifies all systems, user interactions, fragmentation points, and integration gaps. 

**Pass Criteria:**

* Documents the current process with sufficient clarity for readers to understand the existing workflow (visual, narrative, or both formats acceptable)  
* Documents specific procedural steps users follow today  
* Identifies all systems currently in use and how users interact with each  
* Specifies where process fragmentation occurs  
* Catalogs integration gaps between existing platforms  
* Identifies data quality issues, manual tracking methods, and reporting limitations  
* Documents all affected user roles and their current pain points  
* Quantifies inefficiencies (time, cost, error rates)

**Fail Indicators:**

* Vague descriptions like "users enter data into systems" without specifics  
* Missing system names or integration points  
* No identification of where the process breaks down  
* Cannot determine the current state baseline for comparison  
* User roles not identified or pain points not documented  
* Insufficient detail to understand the existing workflow, regardless of format

**Example Pass:**

\[Includes value stream map showing five handoffs AND/OR detailed narrative\] "Customer service representatives begin by receiving claim forms via email (System: Outlook). They manually extract 15 data fields and enter them into Brightree (5-7 minutes per claim). Next, they cross-reference patient eligibility in a separate Excel tracker maintained by billing (System: Shared Drive, updated weekly). If discrepancies exist, representatives email the billing team (average 24-hour turnaround) before proceeding. This fragmentation causes a 2-day delay in 30% of claims."

**Example Fail:**

"Users currently process claims manually across multiple systems, which is time-consuming."

---

### **3\. Solution-Problem Alignment** {#3.-solution-problem-alignment}

**Definition:** The Product Description clearly explains how the product addresses the business problem and improves the current process. Each feature is traceable to a limitation identified in the Current Process section.

**Pass Criteria:**

* Product description explicitly references problems from the Business Problem section  
* Each major feature addresses a specific limitation from the Current Process section  
* Clear explanation of how the product improves the current workflow  
* Objectives use action-oriented verbs (Launch, Improve, Reduce, Increase)  
* Objectives are measurable and time-bound (Key Results included)  
* No features that don't solve stated problems

**Fail Indicators:**

* Features appear without connection to stated problems  
* Product description reads like a wishlist rather than a targeted solution  
* Cannot trace features back to current process limitations  
* Objectives are vague or unmeasurable  
* Scope creep evident (features beyond the stated problem space)

**Example Pass:**

"To eliminate the 45-minute manual cross-referencing burden identified in Section 2, the unified dashboard will automatically retrieve and display claim data from all three systems (Brightree, billing tracker, and email) in a single interface. This addresses the data fragmentation pain point, causing $200K in annual overtime costs."

**Example Fail:**

"The system will include a modern dashboard with analytics and reporting capabilities."

---

### **4\. Narrative Clarity and Plain Language** {#4.-narrative-clarity-and-plain-language}

**Definition:** The PRD uses clear, plain English throughout, avoiding fluffy language, corporate jargon, and unnecessary complexity. Technical concepts are explained precisely without ambiguity.

**Pass Criteria:**

* Uses active voice throughout  
* States exactly what happens without vague descriptors  
* Defines all acronyms on first use  
* Avoids weasel words and ambiguous phrasing  
* Technical constraints and business rules are stated explicitly  
* Uses adverbs sparingly, adjectives only when substantiated  
* Narrative style with full-formed statements (not bullet points in core sections)

**Fail Indicators:**

* Passive voice dominates  
* Corporate jargon ("synergize," "leverage," "holistic solution")  
* Fluffy or vague language ("robust," "scalable," "best-in-class" without definition)  
* Unexplained acronyms  
* Ambiguous terms that could be interpreted in multiple ways  
* Excessive bullet points hide a lack of specificity

**Example Pass:**

"When a representative clicks 'Validate Claim,' the system executes three checks in sequence: (1) patient eligibility verification against the billing database, (2) coverage limit validation against plan details, (3) duplicate claim detection by comparing claim ID and date. If any check fails, the system displays a specific error message and prevents claim submission."

**Example Fail:**

"The system will leverage advanced algorithms to validate claims holistically, providing robust error handling and best-in-class user experience."

---

### **5\. Completeness of Technical Requirements** {#5.-completeness-of-technical-requirements}

**Definition:** The Technical Requirements section defines all external system dependencies, integration patterns (read-only, write-only, bi-directional), data validation rules, error handling, API specifications, compliance requirements, and edge case behaviors.

**Pass Criteria:**

* All external system integrations are identified by name  
* Integration direction specified (read-only, write-only, bi-directional) with justification  
* Data validation rules documented with specific examples  
* Error-handling procedures are detailed for each integration point  
* Behavior defined for integration unavailability scenarios  
* API endpoints, authentication methods, and data formats are specified  
* Compliance and regulatory requirements listed (HIPAA, etc.)  
* Performance, scalability, and security requirements stated  
* Data fields include types, validation rules, and default values

**Fail Indicators:**

* "The system will integrate with third-party APIs" without specifics  
* No mention of what happens when integrations fail  
* Missing data validation rules  
* No compliance or regulatory requirements mentioned when applicable  
* Vague performance requirements ("must be fast")  
* Integration direction not specified

**Example Pass:**

"The system requires read-only integration with Brightree API v2.3 to retrieve claim status. Integration will use OAuth 2.0 authentication with refresh tokens valid for 60 days. If Brightree API returns HTTP 500 or times out after 10 seconds, the system will display 'Claim status unavailable \- retry in 5 minutes' and log the error for manual review. The claim\_id field must be a 12-character alphanumeric string matching regex ^\[A-Z0-9\]{12}$ with no default value."

**Example Fail:**

"The system will integrate with Brightree to get claim data."

---

### **6\. Feature Specificity and Implementation Clarity** {#6.-feature-specificity-and-implementation-clarity}

**Definition:** The Product Features section provides detailed descriptions of each feature with clear boundaries, specific user interactions, workflow logic, exception handling, and explicit acceptance criteria.

**Pass Criteria:**

* Each feature has a clear, descriptive name  
* Functionality and purpose are described in detail  
* User interactions are specified step-by-step  
* Workflow rules and business logic documented  
* Exception handling and edge cases addressed  
* Human-in-the-loop checkpoints identified  
* Features specify how they work together  
* Technical requirements or constraints stated  
* Process maps show reworked workflows with efficiency gains identified

**Fail Indicators:**

* Feature descriptions are high-level overviews  
* "The system will allow users to \[action\]" without explaining how  
* No mention of edge cases or error states  
* Unclear what happens when rules are violated  
* Cannot determine from the description how to implement the feature  
* No workflow diagrams for complex multi-step features

**Example Pass:**

"**Feature: Automated Eligibility Verification**  
 When a representative enters a patient ID and clicks 'Check Eligibility,' the system sends a GET request to the billing database API with patient\_id and claim\_date parameters. Within 2 seconds, the system displays one of three states: (1) 'Eligible \- Coverage Valid' if active coverage is found, (2) 'Not Eligible \- Coverage Expired on \[date\]' if coverage lapsed, or (3) 'Cannot Verify \- Contact Billing' if API returns error or patient not found. Representatives can override 'Cannot Verify' status by clicking 'Manual Review' and adding a justification note (required, minimum 20 characters), which triggers a notification to the billing team."

**Example Fail:**

"**Feature: Eligibility Checking**  
 The system will verify patient eligibility automatically."

---

### **7\. Measurability and Success Criteria** {#7.-measurability-and-success-criteria}

**Definition:** The Measurement section defines specific, software-derived metrics with clear acceptance conditions for production deployment, including quality metrics, data collection methods, and evaluation plans.

**Pass Criteria:**

* Metrics derived explicitly from software capabilities (not external factors)  
* Acceptance conditions for production deployment are clearly stated  
* Quality metrics include quantity, quality, and tracking method  
* Data collection process documented (what, how, when, who)  
* For LLM-based features: inference cost estimates, latency targets, accuracy thresholds  
* Spot check methodology and issue categorization process defined  
* Metrics are measurable within the software itself

**Fail Indicators:**

* Metrics dependent on user behavior outside the software's control  
* "Success will be measured by user satisfaction," without defining how  
* No acceptance criteria for deployment  
* LLM features without cost/latency/accuracy tradeoff analysis  
* Cannot determine from the PRD how to measure if the software is working  
* Vague metrics ("improved efficiency") without specific measurement

**Example Pass:**

"**Acceptance Criterion:** System must complete eligibility verification within 2 seconds for 95% of requests, measured by monitoring API response times in production logs. Quality metric: Automated eligibility determination must match manual billing team verification in 98% of cases, measured through weekly random sampling of 50 claims with human review. Data collection: System logs timestamp of eligibility check start and API response receipt; exports to DataDog dashboard with p95 latency alert threshold set at 2.5 seconds."

**Example Fail:**

"The system will improve claim processing efficiency and increase user satisfaction. Success will be measured by reduced processing times."

---

### **8\. Consistent Formatting and Structure** {#8.-consistent-formatting-and-structure}

**Definition:** The PRD follows the template structure exactly, maintains consistent formatting for similar items throughout, and includes all required sections with appropriate content.

**Pass Criteria:**

* Follows the PRD template section order precisely  
* All required sections present (Business Problem, Current Process, Product Description, Product Features, Technical Requirements, Measurement, Appendix)  
* Consistent formatting within each section type  
* Narrative style maintained (no bullet point abuse)  
* Visual elements (diagrams, tables, charts), if included, should be placed in the Appendix with references in the main text or embedded inline if they clarify complex workflows  
* Acronyms defined in the Appendix  
* Stakeholder section completed with names, roles, and responsibilities

**Fail Indicators:**

* Sections out of order or missing  
* Inconsistent formatting (e.g., some features as paragraphs, others as bullets)  
* Diagrams are scattered throughout the main document  
* No Appendix or incomplete Appendix  
* Switching between narrative and bullet styles arbitrarily

**Example Pass:**

\[PRD follows exact template order: Business Problem → Current Process → Product Description → Product Features → Technical Requirements → Measurement → Appendix. All features are formatted as narrative paragraphs with a consistent structure. All diagrams in the Appendix with Figure references in the main text.\]

**Example Fail:**

\[PRD has sections in random order, switches between bullets and paragraphs, diagrams scattered throughout, and no Appendix\]

---

### **9\. Scope, Discipline, and Anti-Explosion** {#9.-scope,-discipline,-and-anti-explosion}

**Definition:** The PRD maintains tight scope boundaries, with every feature directly solving a stated problem and no speculative or "nice-to-have" additions. The Business Problem section guides all subsequent sections.

Note: While Criterion 3 evaluates whether documented features align with stated problems (forward tracing), Criterion 9 assesses whether the PRD contains ONLY problem-aligned features (scope boundary enforcement). A PRD can pass Criterion 3 by properly justifying its features while failing Criterion 9 by including unnecessary additional features.

**Pass Criteria:**

* Every feature traces back to a Business Problem or a Current Process limitation  
* No features appear that solve unstated problems  
* Product Description scope aligns precisely with stated objectives  
* Sequential section development is evident (each section builds on the previous)  
* No speculative features or future possibilities included  
* PRD describes what WILL be built, not what MIGHT be built  
* Generative AI didn't add unnecessary complexity

**Fail Indicators:**

* Features solving problems not mentioned in the Business Problem section  
* "This could also..." or "Future versions might..." language  
* The scope is significantly larger than the problems warrant  
* Features included "just because we can"  
* Objectives don't align with the business problem  
* Evidence of unchecked LLM-generated scope explosion

**Example Pass:**

\[Business Problem identifies three specific pain points. The Product Features section includes three features, each mapping 1:1 to a pain point. No additional features suggested.\]

**Example Fail:**

\[Business Problem identifies three pain points. Product Features section includes 10 features, many solving problems never mentioned in the Business Problem section, with phrases like "could eventually enable" and "may also provide value for"\]

---

### **10\. Implementability and Engineering Readiness** {#10.-implementability-and-engineering-readiness}

**Definition:** An engineer and designer reading this PRD can build the product without questions about product requirements, business logic, or user workflows.\* Core implementation details are specified, though external system documentation (e.g., third-party API specs) may be referenced rather than duplicated.

"Implementability" assumes engineers have access to standard external resources (API documentation, system schemas, infrastructure specs). The PRD should specify WHICH external systems to integrate with and HOW to use them (authentication, endpoints, data flows), but need not duplicate complete API documentation within the PRD itself.

**Pass Criteria:**

* User stories follow a consistent format with explicit acceptance criteria  
* Business logic rules and formulas are stated in plain language  
* Edge cases and error conditions documented for all features  
* External system integrations are clearly identified with sufficient detail for engineers to locate and use the relevant API documentation  
* No ambiguity about what "done" means for any feature  
* A designer can create mockups from feature descriptions alone  
* An engineer can write code from technical requirements alone, given access to standard external documentation  
* All prerequisites and dependencies identified

**Fail Indicators:**

* "The system should be intuitive," without defining what that means  
* Acceptance criteria missing or vague ("works well")  
* Edge cases not addressed  
* An engineer would need to make product or business logic assumptions to implement  
* Integrations mentioned without specifying which APIs, endpoints, or authentication methods  
* Cannot determine "done" state from PRD alone  
* Too high-level to estimate or implement

**Example Pass:**

"**User Story 1.2: Display Eligibility Status**  
 **Acceptance Criteria:**

* System displays 'Eligible \- Coverage Valid' in green 14pt bold text when API returns status=active  
* System displays 'Not Eligible \- Coverage Expired on \[expiration\_date\]' in red 14pt bold text when API returns status=expired, replacing \[expiration\_date\] with the value from coverage\_end field formatted as MM/DD/YYYY  
* System displays 'Cannot Verify \- Contact Billing' in yellow 14pt bold text when API returns HTTP 500, 503, 404, or times out after 10 seconds  
* Status message appears in the top-right panel directly below the patient name within 100ms of API response receipt  
* Override button labeled 'Manual Review' appears below status message only when status is 'Cannot Verify'

**Edge Cases:**

* If the API returns malformed JSON, treat it as a 'Cannot Verify' state  
* If the patient has multiple active coverages, display coverage with the latest start date  
* If coverage\_end field is null: treat as active coverage with no expiration"

**Example Fail:**

"**User Story:** The system should clearly show users' eligibility status.  
 **Acceptance Criteria:** Status is displayed appropriately."

---

### **11\. AI Agent Task Decomposability** {#11.-ai-agent-task-decomposability}

**Definition:** The PRD provides sufficient detail and structure to enable AI agents to autonomously generate discrete, executable tasks with clear boundaries, tests, dependencies, and completion criteria. Features are described with enough granularity that automated systems can break them into implementable work units without human interpretation.

**Pass Criteria:**

* Complex features are broken into sub-features with clear handoff points and intermediate deliverables  
* Each feature includes explicit user workflows that can be translated into discrete tasks  
* Business logic rules are stated as statements that agents can parse  
* Data transformations and validation rules are specified with input/output formats  
* Integration points specify exact API calls, parameters, and expected responses  
* Error conditions include specific system behaviors and user-facing messages  
* Feature boundaries are clearly defined with explicit entry and exit points  
* Dependencies between features are explicitly stated with sequencing requirements  
* Acceptance criteria use measurable, testable conditions that agents can verify  
* Technical constraints include performance thresholds and resource limits  
* Each feature can be implemented independently or with clearly identified prerequisites  
* Task granularity enables decomposition into work units that are completable within 2-4 hours by an AI agent 

**Fail Indicators:**

* Features described at a high conceptual level requiring human interpretation and back-and-forth dialogue with the domain expert  
* Business logic is stated as general principles rather than specific rules  
* "The system should be intuitive," without defining specific behaviors  
* Integration requirements that need human judgment to implement  
* Acceptance criteria that require subjective evaluation  
* Features with unclear boundaries that could overlap in implementation  
* Missing dependency information between related features  
* Vague error handling that doesn't specify exact system responses  
* Performance requirements stated as "fast" or "responsive" without metrics  
* Features that cannot be broken into discrete, testable work units  
* Features so large that they would require more than two agent days of development work without clear sub-task boundaries  
* Complex workflows are described as single features without intermediate checkpoints or deliverable milestones

**Example Pass:**

Feature 2.3: Eligibility Status Display. When user clicks 'Check Eligibility' button, system executes GET request to /api/eligibility/{patient\_id} with Authorization header containing valid JWT token. If API returns HTTP 200 with status='active', display 'Eligible \- Coverage Valid' in green text (hex \#00AA00) in eligibility-status div. If API returns HTTP 200 with status='expired', display 'Not Eligible \- Coverage Expired on {coverage\_end\_date}' in red text (hex \#FF0000), formatting date as MM/DD/YYYY. If API returns HTTP 404, 500, or times out after 10 seconds, display 'Cannot Verify \- Contact Billing' in yellow text (hex \#FFAA00) and enable 'Manual Override' button. All status changes must complete within 2 seconds and trigger eligibility-changed event for downstream components.

**Example Fail:**

Feature: Eligibility Verification. The system should provide clear, user-friendly eligibility checking that integrates smoothly with existing workflows and handles edge cases appropriately.

---

## **Implementation Guidelines** {#implementation-guidelines}

### **For Evaluators** {#for-evaluators}

**Best Practices:**

* Read the entire PRD before scoring any criteria  
* Focus on observable, objective evidence  
* When borderline, err toward FAIL and document why  
* Document specific examples of both passes and fails  
* Maintain consistent standards across all PRDs  
* If unsure, consult a domain expert or a second evaluator. Don’t score it. 

**Common Pitfalls to Avoid:**

* Scoring based on length rather than content quality  
* Letting later sections influence the scoring of earlier ones  
* Using personal preferences rather than objective criteria  
* Failing to check for all elements in the pass criteria  
* Assuming implied information (if not explicit, it's incomplete)

### **For PRD Authors** {#for-prd-authors}

**Self-Evaluation Checklist:**

Before submitting a PRD, verify:

- [ ] Business Problem quantifies impact with specific numbers  
- [ ] Current Process includes clear, detailed documentation (visual and/or narrative)  
- [ ] Every feature traces back to a stated problem (no scope creep)  
- [ ] All technical jargon is defined; language is plain and clear  
- [ ] Integration specifications include direction and error handling  
- [ ] Features include step-by-step user interactions  
- [ ] The measurement section has specific, software-derived metrics  
- [ ] Format matches the template exactly  
- [ ] An engineer could implement from this PRD alone\* (\*with access to external API docs where applicable)

---

## **Appendix A: Scoring Sheet Template** {#appendix-a:-scoring-sheet-template}

| PRD ID | Author | Project | Criterion 1 | Criterion 2 | Criterion 10 | Total | Notes |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| PRD-001 | John | Porsche | 1 | 0 | 1 | 8/10 | Fails \#2: no visual docs |
| PRD-002 | Sarah | Reliance | 1 | 1 | 0 | 7/10 | Fails \#10: vague acceptance criteria |

---

## **Appendix B: Example Evaluation Session** {#appendix-b:-example-evaluation-session}

**PRD Being Evaluated:** Apex Health Project PRD v22

### **Criterion 1: Business Problem Clarity** {#criterion-1:-business-problem-clarity}

* **Evidence:** "Laboratory technicians spend 30 minutes per sample manually transcribing assay results from equipment readouts into LIMS, resulting in a 15% data entry error rate and $500K annual rework costs..."  
* **Judgment:** PASS \- Specific problem, quantified impact, clear pain points  
* **Score:** 1

* **Evidence:** "Current estimates suggest 20-40% of care coordination and documentation opportunities are missed during visits, including critical follow-ups, specialist referrals, and condition documentation."  
* **Judgment:** FAIL—The Range estimate (20-40%) lacks precision, has no dollar quantification of missed opportunities, and "current estimates suggest" is speculative language without a data source.  
* **Score:** 0

### **Criterion 2: Current Process Documentation** {#criterion-2:-current-process-documentation}

* **Evidence:** It includes a detailed 3-page narrative describing each step with system names (LabVantage LIMS, Excel trackers, Email), quantifying the time spent at each stage, and identifying seven handoffs and fragmentation points.  
* **Judgment:** PASS \- Both visual and narrative present, systems identified  
* **Score:** 1

* **Evidence:** "Research teams create study plans in Excel that must be manually transferred to diagnostic instruments. Each instrument platform (Oscar, CFX, QuantStudio) uses different file formats."  
* **Judgment:** FAIL \- Lists systems but lacks workflow detail. Doesn't specify how manual transfer occurs, which steps fail, time quantification for the current process, or where fragmentation creates problems. Cannot reconstruct the current state from this description.  
* **Score**: 0

### **Criterion 3: Solution-Problem Alignment** {#criterion-3:-solution-problem-alignment}

* **Evidence:** "WTP addresses operational limitations in the current system through improved workflows and data management. Generator registration processes support both individual facilities and distributed generation groups through guided workflows that capture technical specifications, fuel types, and operational parameters... The platform provides security controls through multi-factor authentication, role-based permissions, and organizational access management." For each Current Process problem:  
* **Current:** "Certificate transfers require a complex multi-step process that frequently fails to complete." → **Solution:** "External transfer workflows that require acceptance by the receiving party. Customers can withdraw external transfers before processing, while receiving organizations can reject transfers until they are completed" (Feature REC.04.A)  
* **Current:** "Generation data upload lacks automation, requiring manual entry" → **Solution:** "Customers can self-report generation data for qualified generators and DG Groups through file upload. Multiple generators, DG Groups, and vintages can be uploaded in the same file" (Feature GEN.02.A)  
* **Current:** "System operates on batch processing overnight rather than real-time" → **Solution:** "The system has a default holding period of 14 days... Customers or WestREC Admins can bypass this holding period by accepting the generated data, which will immediately issue certificates" (Feature GEN.15.A)  
* **Judgment:** PASS \- Each major feature explicitly addresses a specific limitation from the Current Process section with clear traceability. No orphaned features that solve unstated problems.  
* **Score:** 1

**Example Fail from Spring Health PRD:**

* **Evidence:** Product Features include "Real-Time Transcription," "Intelligent Recommended Question List," "Visit Data Capture and Export," and "Feedback Loop."  
* **Judgment:** While features connect to general problems, the PRD states that the "exact question generation logic will be detailed in technical specifications to be drafted following this PRD," making verifying solution-problem alignment for the core recommendation feature impossible. Specific question generation logic cannot be traced back to stated problems without this detail.

### **Criterion 4: Narrative Clarity and Plain Language** {#criterion-4:-narrative-clarity-and-plain-language}

* **Evidence:** "Customers can register new generators by filling in required and optional static data through controlled workflows that accommodate draft status while working on registrations. Users complete generator registration forms with fields controlled by dropdowns and subject to various validations that ensure data accuracy and completeness. The system enables customers to save generators as draft status during the registration process and submit completed generators into pending status for administrative review. Generator registration captures facility specifications, including nameplate capacity, fuel types, technology configurations, and location data required for certificate creation and regulatory compliance."  
* **Judgment:** PASS \- Active voice throughout ("Customers can register," "system enables"), specific actions described ("save generators as draft status"), technical terms defined without jargon, clear sequence of operations. Uses adverbs sparingly, no fluffy language like "robust" or "best-in-class."  
* **Score:** 1

**Example Fail from Apex Health PRD:**

* **Evidence:** "The platform is a unified software ecosystem designed to transform Apex Health's end-to-end research and development workflow by centralizing data, automating manual processes, and providing integrated analytics capabilities."  
* **Judgment:** FAIL \- Vague language ("unified software ecosystem," "transform"), corporate jargon without substance, doesn't explain what the system actually does. "Integrated analytics capabilities" could mean anything. Lacks specificity about actual functionality.

### **Criterion 5: Completeness of Technical Requirements** {#criterion-5:-completeness-of-technical-requirements}

* **Evidence:** "TECH.01. Track IP Addresses: WestREC administrators can track the IP addresses used for API keys to protect against third-party access, which WestREC does not allow. The system maintains IP address logs for all API key usage to enable identification of unauthorized third-party access attempts to WestREC data.  
  TECH.02. Unique API Keys: The system generates unique API keys to track access to and usage of the API. Organizations can create multiple API keys if desired, and the system ties all actions back to specific API keys for auditing purposes.  
  1.2. Multi-Factor Authentication (LOG.02.A): Users can configure multi-factor authentication requirements at individual and organizational levels to enhance account security for sensitive renewable energy certificate data. The system supports multiple authentication methods, including SMS verification codes and authenticator applications that accommodate different organizational security policies.  
  TECH.11. System Uptime & Reliability: The system maintains 99.9% system uptime post-launch with minimal critical defects while delivering sub-three-second page load times across all user interfaces. The platform supports 2x current transaction volumes without performance degradation and provides scalability to handle growth from 4,000 to 12,000 users over 5-10 years through cloud-native architecture and optimized database design."  
* **Judgment:** PASS \- External systems identified (API integration), authentication methods specified (MFA with SMS/authenticator apps), error handling documented (IP address logging for security), performance requirements stated (99.9% uptime, sub-three-second page load), scalability requirements defined (2x transaction volumes, 4K to 12K users), security compliance addressed (audit logging, access controls)—integration patterns specified through API key management and tracking.  
* **Score:** 1

**Example Fail from Spring Health PRD:**

* **Evidence:** "The 360View requires seamless integration with Spring Health's existing clinical systems to access comprehensive patient data and deliver recommendations within the workflow constraints of home visits. The system will establish read-only API access to Spring Health Assistant to retrieve patient profiles, care gaps, medication lists, and previous visit information. Similarly, integration with Athena EMR as the primary clinical documentation system will enable the extraction of detailed clinical history, laboratory results, and diagnostic information essential for generating accurate recommendations."  
* **Judgment:** FAIL \- States integration is needed, but provides no specifics: which API endpoints? What authentication method? What happens when Athena EMR is unavailable? No data validation rules, no error handling procedures, no API specifications. States "API access requirements and integration specifications will be documented in the technical design" \- deferring critical requirements.

### **Criterion 6: Feature Specificity and Implementation Clarity** {#criterion-6:-feature-specificity-and-implementation-clarity}

* **Evidence:** "**Feature 6.8: Feasibility Checks** The system uses Capacity Factors or Max Annuals on registrations to determine whether an uploaded value is reasonable based on registration information and time period. A generation outside of the reasonable range is placed in pending status until it can be reviewed and approved/rejected by the Admin. Customers and QREs receive notifications when uploaded generation fails feasibility, so they can verify and update the totals as needed. WestREC Admins receive notifications when the generation fails to review the amount for approval or rejection.  
  **Feature 6.9: Capacity Factor Curves** The system uses Capacity Factor Curves on registrations to determine whether an uploaded value is reasonable based on registration information, time period, and month. A generation outside of the reasonable range is placed in pending status until it can be reviewed and approved/rejected by the Admin. WestREC Admins can use different capacity factors for each month for a specified generator, so annual patterns are considered, reducing the number of false positives received on feasibility checks. Admins can update capacity factor curves individually and in bulk."  
* **Judgment:** PASS \- Feature has a clear name and purpose (feasibility validation), user interactions specified (upload → validation → pending status → notification), workflow logic documented (capacity factor comparison, monthly curves), exception handling addressed (outside range → pending review), and technical requirements stated (capacity factors per month, bulk updates). The designer could create mockups, and the engineer could implement.  
* **Score:** 1

**Example Fail from Spring Health PRD:**

* **Evidence:** "**Feature 3: Intelligent Recommended Question List.** The recommendation engine combines the patient's clinical history gathered during pre-visit analysis with real-time conversation transcription to create a dynamically updated list of targeted questions... The detailed logic for question generation, confidence thresholds, and ranking criteria will be specified in technical requirements following PRD approval."  
* **Judgment:** FAIL \- High-level overview without implementation details. How does it "combine" history with transcription? What are the "confidence thresholds"? What constitutes "dynamically updated"? The critical phrase "will be specified in technical requirements following PRD approval" means this feature cannot be implemented from the PRD alone: missing edge cases, no acceptance criteria, no workflow diagrams.  
* **Score:** 0

### **Criterion 7: Measurability and Success Criteria** {#criterion-7:-measurability-and-success-criteria}

* **Evidence:** "WTP success will be measured primarily by its ability to fully replace the existing system while providing a foundation for future expansion. System performance will be tracked through 99.9% uptime availability and sub-three-second page load times, ensuring reliable access for mission-critical operations.   
* User adoption success will be demonstrated through a minimum 85% customer satisfaction score and 90% of core users completing compliance and registration tasks without assistance within three months post-launch. The platform must support 2x current transaction volumes without performance degradation, ensuring scalability for renewable energy market growth. Technical success will be measured by ≥99.95% data integrity post-migration and successful API integrations with key external systems, as API functionality is critical to MVP delivery and user satisfaction."  
* **Judgment:** PASS \- Metrics are software-derived (99.9% uptime measured by system monitoring, sub-three-second page load measured by response time logging, 2x transaction volumes measured by throughput metrics, 99.95% data integrity measured by validation checks). Acceptance conditions for production deployment are clearly stated. Quality metrics include specific thresholds. Data collection methods are implicit in the metrics (system logs, monitoring tools).  
* **Score:** 1

**Example Fail from Spring Health PRD:**

* **Evidence:** "Provider Time Saved: The system's operational value manifests in time savings for nurse practitioners, medical assistants, and physicians throughout their visit workflow... The target of a fifteen to twenty-five percent reduction in total visit preparation and documentation time represents meaningful efficiency gains."  
* **Judgment:** FAIL—The Metric depends on external factors (provider behavior, visit complexity, patient conditions) that are not fully controlled by the software. "Manifests in time savings" is vague about measurement. The range estimate (15-25%) shows uncertainty. No data collection process is documented—how will time be measured? No baseline is established. We cannot determine how to measure whether the software from the PRD is working.

### **Criterion 8: Consistent Formatting and Structure** {#criterion-8:-consistent-formatting-and-structure}

* **Evidence:** The WestREC PRD follows this exact structure:  
1. Business Problem  
2. Current Process  
3. Product Definition  
4. Product Features (with numbered subsections 1-12, each with sub-features numbered X.X)  
5. Measurement and Success Criteria  
6. Technical Requirements (with numbered TECH.01-TECH.11)  
7. Appendix (with User Type Definitions)  
   All features follow a consistent format: feature number, Feature name, Feature code (e.g., LOG.01.A), and detailed description. Technical requirements are consistently numbered (TECH.01, TECH.02, etc.).  
* **Judgment:** PASS—It follows the template structure precisely, has consistent formatting within each section type, maintains an arrative style, and presents all required sections with appropriate content. The appendix provides supporting definitions.  
* **Score:** 1

**Example Fail from Apex Health PRD:**

* **Evidence:** Sections include the business Problem, Current Process, Pain Points, Hypotheses, Product Description, Personas, Process Flow, Ontology, Product Features, Technical Requirements, Measurement, and appendix. Features are inconsistently formatted—some have clear headers, others are buried in prose. There is a mix of narrative and bullet points throughout. The ontology section includes 23 object types, validation rules, and action types mixed without clear organization.  
* **Judgment:** FAIL \- Deviates from the template by including "Hypotheses" and "Pain Points" as separate sections. Inconsistent formatting \- features are sometimes numbered and sometimes just named. Massive ontology section (23 object types) disrupts flow and should be in the appendix or technical documentation. Switches between narrative and technical specifications arbitrarily.

### **Criterion 9: Scope, Discipline, and Anti-Explosion** {#criterion-9:-scope,-discipline,-and-anti-explosion}

* **Evidence:** Business Problem identifies three core challenges:  
1. Platform expiration is leaving WestREC without a functioning system  
2. Support for 4,000 current users is growing to 12,000 users  
3. Multi-jurisdictional requirements across the Western Interconnection  
   Product Features include exactly what's needed to address these:  
* User Authentication (addresses security for 4K-12K users)  
* Organization Management (addresses multi-jurisdictional requirements)  
* Generator Registration (core REC tracking functionality)  
* Account Management (certificate lifecycle)  
* Generation Data Management (REC creation from meter data)  
* Certificate Transactions (compliance operations)  
* System Administration (scalability infrastructure)  
* Payment Portal (billing for organization fees)  
  No features appear that solve unstated problems. Every feature traces directly to replacing existing platform functionality or addressing stated pain points about manual processes, transfer failures, or batch processing delays.  
* **Judgment:** PASS \- Every feature directly addresses stated problems. No speculative features, no "could also" language, no "future versions might." Scope precisely aligns with replacing existing system functionality, plus addressing identified inefficiencies. Sequential section development is evident \- Business Problem → Current Process → Product Definition → Features that solve those problems.  
* **Score:** 1

**Example Fail from Apex Health PRD:**

* **Evidence:** Business Problem identifies: fragmented workflows, manual Excel processes, disconnected tools, and a lack of traceability. Product Features include: Study Plan Management, Data Ingestion, Unified Analytics, Visualization... PLUS:  
* Complete 23-object Ontology system  
* Multiple platform adapters for 5+ instrument types  
* XML Protocol Version Control System  
* Queryable experiment model with SQL layer  
* EAV variable store architecture  
* Metrics registry with formula catalog  
* JMP export integration  
* Git workflow internalization  
* **Judgment:** FAIL \- Massive scope explosion beyond stated problems. The ontology of 23 interconnected object types far exceeds what's needed to solve "manual Excel processes." Building a complete data modeling framework, SQL optimization layer, metrics registry, and multi-platform normalization architecture suggests the scope expanded during design without revisiting whether all this solves actual business problems—evidence of unchecked technical architecture expansion.

### **Criterion 10: Implementability and Engineering Readiness** {#criterion-10:-implementability-and-engineering-readiness}

* **Evidence:** "System integrates with Brightree API v2.3 (documentation: [https://api.brightree.com/docs](https://api.brightree.com/docs)) using OAuth 2.0. Required endpoints: GET /claims/{id} for retrieval, POST /claims for submission. Authentication tokens expire after 60 minutes. When API returns HTTP 429 (rate limit), wait 60 seconds before retry..."  
* **Judgment:** PASS \- Specifies which API, version, authentication method, specific endpoints needed, and error handling. Engineers can locate Brightree API docs externally.  
* **Score:** 1

**Example Fail:**

* **Evidence:** "System will integrate with Brightree for claims processing."  
* **Judgment:** FAIL \- Doesn't specify API version, which endpoints, authentication method, or how to handle errors. The engineer cannot determine the implementation approach.

### **Criterion 11: AI Agent Task Decomposability** {#criterion-11:-ai-agent-task-decomposability}

* **Evidence:** "Feature 6.8: Feasibility Checks  
  The system uses Capacity Factors or Max Annuals on registrations to determine whether an uploaded value is reasonable based on registration information and time period. Generation outside of the reasonable range is placed into pending status until it can be reviewed and approved/rejected by the Admin. Customers and QREs receive notifications when uploaded generation fails feasibility so they can verify the totals and update as needed. WestREC Admins receive notifications when generation fails, feasibility to manually review the amount for approval or rejection.  
* **Feature 6.9: Capacity Factor Curves (GEN.09.A):** The system uses Capacity Factor Curves on registrations to determine whether an uploaded value is reasonable based on registration information, time period, and month. Generation outside of the reasonable range is placed into pending status until it can be reviewed and approved/rejected by the Admin. WestREC Admins can use different capacity factors for each month for a specified generator so annual patterns are taken into account, reducing the number of false positives received on feasibility checks. Admins can update capacity factor curves individually and in bulk."

* **AI Agent Task Decomposition:**  
  An AI agent could autonomously generate these discrete, executable tasks:  
  **Task 1 (2 hours):** Create a database schema for the Capacity Factor storage  
* Input: Registration table structure  
* Output: `capacity_factors` table with fields (registration\_id, capacity\_factor\_value, max\_annual\_value, effective\_date)  
* Test: Table created with proper foreign keys, constraints, and indexes  
* Dependencies: None (foundational task)  
  **Task 2 (3 hours):** Implement feasibility validation logic  
* Input: Uploaded generation value, registration information, time period  
* Output: Boolean (passes\_feasibility) \+ reason\_code if failed  
* Business rule: `IF uploaded_value > (capacity_factor × time_period) THEN fails_feasibility = TRUE`  
* Test: Unit tests with boundary values (at threshold, 1 below, 1 above, 100x above)  
* Dependencies: Task 1 complete  
* **Judgment:** PASS.   
  This feature exemplifies perfect AI agent task decomposability. An autonomous agent could read this specification and generate a complete implementation plan without requiring human intervention.  
  **Why This is the Best PASS:**  
  * **Complete decomposability:** Feature breaks into discrete tasks totaling   
  * **Clear boundaries:** Each task has explicit entry/exit points and handoffs  
  * **Testable conditions:** Every task includes specific, measurable tests  
  * **No ambiguity:** Business logic stated as conditional rules parseable by agents  
  * **Explicit dependencies:** Task sequencing is clearly defined  
  * **Time-bounded:** Each task is completable in 1-3 hours  
  * **Integration specifications:** API endpoints, parameters, and message formats provided  
  * **Error conditions:** Specific system behaviors are defined for all failure cases  
  * **Independent execution:** The Agent can implement each task without human interpretation  
* **Score:** 1

**Example Fail: Spring Health Feature 3 (Intelligent Recommended Question List)**

* **Evidence: "Feature 3: Intelligent Recommended Question List**  
* The recommendation engine combines the patient's clinical history gathered during pre-visit analysis with real-time conversation transcription to create a dynamically updated list of targeted questions. As the provider and patient discuss various topics, the system tracks what has been covered and continuously refines its recommendations by removing questions that have already been addressed. The system applies sophisticated confidence thresholds to ensure only high-value questions are surfaced, maintaining the principle that no recommendation is better than a poor recommendation.  
  When the system detects conversation conclusion signals such as 'any other questions' or 'let me schedule your follow-up,' it presents up to three high-confidence questions for the provider to ask before the visit ends. These recommendations address specific clinical scenarios identified through pattern recognition, with particular focus on the four primary Medicare Advantage conditions: diabetes, heart disease, COPD/lung disease, and cancer.  
  The recommendation engine prioritizes questions that align with Spring Health's clinical value framework: early recognition of disease, appropriate treatment, and prevention of complications...  
  Note: Detailed technical specifications including specific question generation logic, risk stratification factors, medication-to-condition mapping, and palliative care referral criteria will be documented in comprehensive technical requirements following PRD approval."  
* **AI Agent Task Decomposition Attempt:** An AI agent attempting to decompose this feature encounters blocking questions at every step:  
* Attempted Task 1: "Combine patient clinical history with transcription"  
  * ❌ Blocker 1: HOW does it "combine"? String concatenation? Vector embeddings? LLM context window? Structured merge?  
  * ❌ Blocker 2: What fields from clinical history? All 200+ EMR fields? Specific subset? Which sections?  
  * ❌ Blocker 3: What format is transcription in? Raw text string? JSON with speaker labels? Timestamped segments?  
  * ❌ Blocker 4: When does combining occur? Real-time streaming? Batch every 30 seconds? On-demand?  
* **Judgment:** FAIL \- This feature is described as a product vision rather than an implementation specification. An AI agent would need to ask 30+ clarifying questions before generating even the first implementable task. The feature fundamentally lacks the granularity, specificity, and explicit logic required for autonomous task decomposition.  
* **Critical Note:** The explicit statement "Detailed technical specifications including specific question generation logic... will be documented in comprehensive technical requirements following PRD approval" is evidence that the PRD author knows critical specifications are missing. An AI agent cannot wait for future documentation—it requires complete specifications in the PRD to generate executable tasks.  
* **Score:** 0  
  ---

## **Appendix C: Failure Mode Taxonomy** {#appendix-c:-failure-mode-taxonomy}

Common PRD failure patterns observed:

1. **Generic Problem Statements:** "Process is inefficient" without specifics  
2. **Missing Quantification:** No cost, time, or error rate data  
3. **Assumed Context:** Writer assumes the reader knows unstated information  
4. **Scope Explosion:** Features beyond the stated problem space  
5. **Jargon Overload:** Corporate speak obscuring meaning  
6. **Visual-Narrative Gap:** Diagrams contradict text descriptions  
7. **Feature-Problem Disconnect:** Cannot trace the feature to the stated problem  
8. **Vague Acceptance Criteria:** "Works well" instead of specific conditions  
9. **Missing Edge Cases:** Happy path only, no error handling  
10. **Integration Hand-Waving:** "Will integrate with X" without details  
11. **External Documentation Confusion:** PRD either duplicates the entire API documentation unnecessarily OR fails to specify which external systems and endpoints to use, leaving engineers guessing

---

## **Appendix D: Inter-Evaluator Agreement Protocol** {#appendix-d:-inter-evaluator-agreement-protocol}

When multiple evaluators score the same PRD:

1. **Independent Scoring:** Each evaluator scores separately without discussion  
2. **Calculate Agreement:**  
   * **Cohen's Kappa** for overall agreement across all criteria  
   * **Per-Criterion Agreement Rate:** (\# agreed scores) / (\# total scores)  
3. **Alignment Session:** For disagreements:  
   * Each evaluator explains their reasoning with specific evidence  
   * Identify ambiguities in rubric definitions  
   * Reach consensus or refine criteria  
4. **Target Agreement:** Aim for \>85% agreement rate and Kappa \>0.75

---

## **References** {#references}

* Shankar, S., & Husain, H. (2025). *Application-Centric AI Evals for Engineers and Technical PMs.*  
* PRD Template v0.3 (March 2025\)  
* Rules of Material Writing

---

