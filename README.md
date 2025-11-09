# EvalPRD as a Service

A PRD evaluation platform that analyzes Product Requirements Documents against 11 critical criteria, providing binary PASS/FAIL scoring, prioritized fix plans, and AI agent-executable task graphs.

## Features

- **Binary Scoring**: No fuzzy 1-10 scales. Each criterion is PASS or FAIL with quoted evidence from the document.
- **Prioritized Fix Plan**: Automatically identify highest-leverage improvements. Know exactly what to fix first.
- **Agent-Ready Tasks**: Get executable task units with dependencies mapped—ready to feed directly to AI agents or sprint planning.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│ API Gateway  │────────▶│ MCP Server  │
│  (React)    │  HTTP   │  (Fastify)   │  stdio  │  (OpenAI)   │
└─────────────┘         └──────────────┘         └─────────────┘
```

### Components

1. **Frontend** (`frontend/`): React + Vite + Tailwind landing page with file upload and results display
2. **API Gateway** (`api-gateway/`): Fastify server that bridges HTTP requests to MCP tools
3. **MCP Server** (`mcp-server/`): Model Context Protocol server with 3 evaluation tools powered by OpenAI

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- OpenAI API key

### Local Development

1. **Clone and install**:
```bash
git clone <repo-url>
cd prd-as-a-service
```

2. **Setup MCP Server**:
```bash
cd mcp-server
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm run build
```

3. **Setup API Gateway**:
```bash
cd ../api-gateway
npm install
cp .env.example .env
npm run dev
```

4. **Setup Frontend**:
```bash
cd ../frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000 and will connect to the API gateway at http://localhost:8080.

### All Services (Development)

```bash
# Terminal 1: API Gateway
cd api-gateway && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

## The 11-Point PRD Rubric

### Must-Pass Criteria (Gating)
- **C3**: Solution–Problem Alignment
- **C5**: Technical Requirements Completeness
- **C10**: AI Agent Readiness & Implementability
- **C11**: AI Agent Task Decomposability

### Additional Criteria
- **C1**: Business Problem Clarity
- **C2**: Current Process Documentation
- **C4**: Narrative Clarity & Plain Language
- **C6**: Feature Specificity & Implementation Clarity
- **C7**: Measurability & Success Criteria
- **C8**: Consistent Formatting & Structure
- **C9**: Scope Discipline (Anti-Explosion)

### Readiness Gates

- **GO**: ≥9/11 PASS and all gating criteria (C3, C5, C10, C11) pass
- **REVISE**: 7-8/11 PASS or any gating criteria fail
- **HOLD**: ≤6/11 PASS or ≥3 compliance gaps (GxP/Part 11/HIPAA)

## API Endpoints (Streaming)

All endpoints use **Server-Sent Events (SSE)** for real-time progress with GPT-5.

### POST /api/evalprd/binary_score
Evaluate PRD with PASS/FAIL for each criterion (streaming).

**Request**:
```json
{
  "prd_text": "Full PRD text...",
  "artifacts": [
    {"name": "Jira-123", "kind": "jira", "content": "..."}
  ],
  "evidence_per_criterion": 1
}
```

**Response**:
```json
{
  "rubric_version": "v1.0",
  "pass_count": 3,
  "fail_count": 8,
  "criteria": [
    {
      "id": "C1",
      "name": "Business Problem Clarity",
      "pass": true,
      "status": "pass",
      "rationale": "Problem and impact quantified.",
      "evidence": [{"quote": "30% drop-off...", "locator": {"section": "Executive Summary"}}]
    }
  ],
  "readiness_gate": {
    "state": "HOLD",
    "must_pass_met": false,
    "total_pass": 3,
    "reason": "Must-pass failed (C5,C10,C11)"
  }
}
```

### POST /api/evalprd/fix_plan
Generate prioritized improvement plan (streaming).

**Request**:
```json
{
  "prd_text": "Full PRD text...",
  "limit": 10
}
```

**Response**:
```json
{
  "items": [
    {
      "id": "FP-1",
      "title": "Add API contracts & RBAC",
      "priority": "P0",
      "owner": "PM + Eng Lead",
      "blocking": true,
      "effort": "M",
      "impact": "High",
      "description": "Define endpoints with auth details...",
      "steps": ["Define POST /alerts", "OAuth2 CC + mTLS"],
      "linked_criteria": ["C5", "C10"]
    }
  ]
}
```

### POST /api/evalprd/agent_tasks
Decompose into 2-4h executable tasks (streaming).

**Request**:
```json
{
  "prd_text": "Full PRD text...",
  "task_hours_min": 2,
  "task_hours_max": 4,
  "emit_mermaid": true
}
```

**Response**:
```json
{
  "tasks": [
    {
      "id": "T1",
      "feature": "F2.1 Alert Ingestion",
      "title": "Create alerts schema",
      "description": "Define alerts table with fields...",
      "duration": "2h",
      "est_hours": 2,
      "entry": "DB up",
      "exit": "DDL merged",
      "test": "Run migration twice → no errors",
      "status": "ready"
    }
  ],
  "edges": [{"from": "T1", "to": "T2"}],
  "mermaid": "flowchart TD; T1-->T2;"
}
```

## Custom GPT Parity

This system replicates the EvalPRD custom GPT with 100% fidelity. Key factors:

### Temperature Configuration

**Critical for consistency** - temperature controls output randomness:
- `binary_score`: 0.2 (low randomness for deterministic scoring)
- `fix_plan`: 0.3 (balanced for creative yet consistent fixes)
- `agent_tasks`: 0.3 (balanced for structured task decomposition)

Previous bug: Tools were using temperature = 1.0 (maximum randomness), causing high output variance.

### Complete Rubric Embedding

The custom GPT has access to a 771-line rubric document. We achieve parity by:
1. Extracting all 11 criterion definitions into `mcp-server/src/lib/rubric-definitions.ts`
2. Including detailed PASS/FAIL criteria for each
3. Embedding real-world examples:
   - **WestREC PRD** (shows strong PASS patterns)
   - **Spring Health PRD** (shows clear FAIL patterns)
   - **Apex Health PRD** (shows scope explosion)
4. Injecting complete definitions into system prompt

### Golden Test Files

Reference outputs in `tests/golden/spotify/` from actual custom GPT evaluation:
- `expected-score.json` - 2 PASS / 9 FAIL, HOLD gate
- `expected-fix-plan.json` - 10 prioritized fixes
- `expected-agent-tasks.json` - 10 executable tasks
- `expected-readiness.json` - Gate decision with reason

### Validation

```bash
# Run validation against golden files
node tests/validate-parity.mjs

# Manual testing
# 1. Start API gateway: cd api-gateway && npm run dev
# 2. Test endpoints with test-request.json:
curl -X POST http://localhost:8080/api/evalprd/binary_score \
  -H 'Content-Type: application/json' \
  --data @test-request.json > output-score.json

# 3. Run validation
node tests/validate-parity.mjs --compare
```

## Testing

```bash
# Run integration tests
cd tests
node integration.mjs

# Validate parity with custom GPT
node validate-parity.mjs
```

## Environment Variables

### MCP Server
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `EVALPRD_MODEL`: OpenAI model to use (default: `gpt-5`)
- `LOG_LEVEL`: Logging level (default: `info`)
- `REQUEST_TIMEOUT_MS`: OpenAI timeout in milliseconds (default: `180000` = 3 minutes)

**Note**: Temperature is hardcoded in tool files for consistency:
- binary_score: 0.2
- fix_plan: 0.3
- agent_tasks: 0.3

### API Gateway
- `PORT`: Server port (default: `8080`)
- `ALLOWED_ORIGIN`: CORS origin (default: `http://localhost:3000`)
- `RATE_LIMIT_MAX`: Max requests per window (default: `60`)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (default: `60000`)

## Security

- Never log PRD content (only hashes for debugging)
- Enforce CORS origin allowlist
- Rate limiting: 60 req/min default
- All communications use TLS in production
- Treat PRDs as confidential/regulated data

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
