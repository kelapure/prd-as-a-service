# PRD: Patient Alert Prioritization System

## Executive Summary

Medical practices face significant inefficiency in managing patient communications. Current alert systems treat all notifications equally, resulting in 30% drop-off in critical interventions and staff burnout from triaging hundreds of undifferentiated alerts daily.

This PRD proposes an AI-powered Alert Prioritization System that scores, routes, and tracks patient notifications to ensure high-risk cases receive immediate attention while reducing alert fatigue for care teams.

## Business Problem

- **Volume overload**: Each practice receives 200-500 alerts/day across email, Veeva, and manual reports
- **No differentiation**: Critical alerts (e.g., adverse events) sit alongside routine notifications
- **Missed interventions**: 30% of high-priority alerts are addressed >24h after receipt
- **Staff burnout**: Care coordinators spend 4h/day manually triaging alerts
- **Compliance risk**: Audit trails are manual and incomplete

**Quantified Impact**: Reducing intervention time from 24h to 4h for priority alerts can prevent 15-20% of adverse outcomes based on historical retrospective analysis.

## Current Process

1. Alerts arrive via: Veeva notifications, email forwards, LIMS extracts, manual phone logs
2. Practice hub staff manually review each alert
3. Hub staff forward to PAM/FAM based on subjective assessment
4. PAM/FAM manually log in tracker spreadsheet
5. Follow-up actions tracked via email and phone calls

**Pain Points**:
- No central repository
- Inconsistent scoring criteria
- No automated routing
- Limited audit trail
- Delayed escalation for urgent cases

## Proposed Solution

Build an Alert Prioritization System that:

1. **Ingests** alerts from multiple sources (Veeva webhook, email parsing, LIMS API, manual entry)
2. **Scores** each alert using deterministic rules and ML risk model (0-100 scale)
3. **Routes** alerts to appropriate role (PAM/FAM/HUB/KAM) based on score + business rules
4. **Tracks** all actions with ALCOA+ compliant audit trail
5. **Escalates** high-priority alerts via SMS/Slack if not acknowledged within SLA

## Technical Requirements

### F1: Multi-Source Alert Ingestion

**Veeva Integration**:
- Webhook endpoint: POST /api/alerts/veeva
- Authentication: OAuth 2.0 Client Credentials + IP allowlist
- Payload validation: alert_id (UUID), patient_id (UUID), event_type (enum), event_timestamp (ISO-8601)
- Deduplication: SHA-256 hash of (patient_id + event_type + event_timestamp)
- Error handling: 4xx return structured error code, 5xx write to DLQ and alarm if >0.5% of volume in 5min window

**Email Parsing**:
- Inbound email to alerts@practicemail.com
- Parse sender, subject, body; extract patient_id via regex
- Store original email in S3 (encrypted at rest, KMS)
- Create alert record with source="email"

**LIMS API Pull**:
- Cron job every 15min
- GET /lims/alerts with pagination
- Transform to internal schema
- Mark processed alerts in LIMS

### F2: Alert Scoring & Prioritization

**Scoring Model**:
- Deterministic rules-based score (60% weight): days_stuck, stage criticality, event type
- ML risk score (40% weight): logistic regression on historical interventions
- Combined score (0-100)

**Priority Thresholds**:
- P0 (score ≥80): Immediate escalation
- P1 (50-79): Route within 2h
- P2 (<50): Next business day

**Routing Logic**:
- If P0 and patient in oncology trial → FAM
- If P1 and patient in commercial program → PAM
- If P2 → Hub coordinator

### F3: RBAC & Audit Trail

**Roles**:
- Hub: view all alerts, assign, comment
- PAM/FAM: view assigned alerts, update status, add notes
- KAM: read-only view for escalations
- Admin: configure rules, export audit logs

**Audit Requirements**:
- ALCOA+ compliant: Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available
- Log all CRUD operations: user_id, timestamp, action, before/after state
- Immutable log (append-only table with hash chain)
- 7-year retention
- Encrypted at rest (KMS) and in transit (TLS 1.2+)

### F4: SLA Monitoring & Escalation

**SLAs**:
- P0: acknowledge within 30min, resolve within 4h
- P1: acknowledge within 2h, resolve within 24h
- P2: acknowledge within 24h

**Escalation**:
- If P0 not acknowledged in 30min → SMS to on-call PAM + Slack #alerts-critical
- If P1 not acknowledged in 2h → Email to team lead
- Dashboard shows SLA compliance by user, week, alert type

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Mean time to P0 intervention | 24h | <4h | Timestamp deltas in DB |
| Alerts correctly routed (precision) | N/A | ≥95% | Weekly spot-check by supervisor |
| Staff time on triage | 4h/day | <1h/day | Time-tracking logs |
| Audit trail completeness | 40% | 100% | Quarterly compliance review |

## Scope Boundaries

**In Scope**:
- Alert ingestion from Veeva, email, LIMS
- Scoring and routing
- Web UI for alert management
- Audit trail and SLA monitoring

**Out of Scope** (separate PRDs):
- Patient communication outreach (handled by existing CRM)
- Predictive analytics dashboard (roadmap Q4)
- Integration with external EMR systems (deferred pending vendor selection)

## Dependencies

- Veeva API access (requires legal review + BAA)
- LIMS vendor API documentation (in progress)
- KMS key provisioning (Ops team, 2-week lead time)

## Open Questions

- Should we support manual phone call logging in V1 or defer to V2?
- What is the escalation path if SMS fails (backup phone? email?)?
- Do we need a separate "urgent but non-clinical" priority level?
