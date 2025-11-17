# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EvalPRD as a Service - A PRD evaluation platform that analyzes Product Requirements Documents against 11 critical criteria, providing binary PASS/FAIL scoring, prioritized fix plans, and AI agent-executable task graphs.

## Architecture

Full-stack application with two main components:

1. **Frontend** (`frontend/`) - React + Vite + TypeScript landing page with file upload and real-time streaming results
2. **API Gateway** (`api-gateway/`) - Fastify server with direct Anthropic Claude SDK integration (streaming + structured outputs)

**Key Design**: Direct Anthropic SDK integration eliminates MCP server subprocess overhead, enabling real-time SSE streaming with <200ms time-to-first-byte.

## Repository Structure

```
├── frontend/              # React + Vite landing page
│   ├── src/
│   │   ├── components/    # Page and UI components
│   │   └── index.css      # Tailwind v4 CSS
│   ├── package.json
│   └── vite.config.ts
├── api-gateway/           # HTTP API + Evaluation Engine
│   ├── src/
│   │   ├── server.ts      # Fastify server with /api/evalprd/* endpoints
│   │   ├── evaluators/    # binary_score, fix_plan, agent_tasks
│   │   └── lib/           # schemas, prompts, claude, validation, rubric, util
│   ├── package.json
│   └── tsconfig.json
├── data/                  # Test fixtures and sample PRDs
├── tests/                 # Integration tests and golden contracts
└── CLAUDE.md             # This file
```

## Development Commands

### Initial Setup
```bash
# API Gateway
cd api-gateway
npm install
cp .env.example .env      # Add ANTHROPIC_API_KEY=sk-ant-...

# Frontend
cd frontend
npm install
```

### Running Services
```bash
# Terminal 1: API Gateway (port 8080)
cd api-gateway && npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev
```

### Build & Type Checking
```bash
# API Gateway
cd api-gateway
npm run build             # TypeScript → dist/
npm run type-check        # Check types without emitting
npm start                 # Production mode (node dist/server.js)

# Frontend
cd frontend
npm run build             # Vite → build/
npm start                 # Serve production build (port from $PORT env)
```

### Testing
```bash
# Integration tests (requires running API Gateway)
cd tests
node test-full-flow-automated.js        # End-to-end automated test
node test-production-rendering.js       # UI rendering validation

# Frontend: Generate example data from golden test outputs
cd frontend && npm run generate-spotify-results
```

## API Gateway Architecture

### Three Evaluation Endpoints

1. **POST /api/evalprd/binary_score** - PASS/FAIL evaluation of 11 criteria with evidence, compliance gaps, readiness gate
2. **POST /api/evalprd/fix_plan** - Prioritized fix plan with P0/P1/P2 priorities, owners, effort, impact
3. **POST /api/evalprd/agent_tasks** - 2-4h executable tasks with DAG dependencies, inputs/outputs, entry/exit/test conditions

### System Prompt

All tools use the exact "EvalGPT" system prompt (lib/prompts.ts) which embeds the complete 11-criterion rubric with detailed definitions, pass/fail indicators, and examples. This provides 100% parity with the custom GPT.

**Key Components**:
- Complete criterion definitions with pass/fail criteria (from `rubric-definitions.ts`)
- Real-world examples from WestREC, Spring Health, and Apex Health PRDs
- Failure mode taxonomy
- Pharma/GxP overlay (Part 11, HIPAA, ALCOA+, RBAC)
- Readiness Gates: GO (≥9/11 + gating criteria), REVISE (7-8/11), HOLD (≤6/11 or ≥3 compliance gaps)
- Gating criteria: C3 (Solution Alignment), C5 (Tech Requirements), C10 (Implementability), C11 (Agent Decomposability)

**Temperature Settings** (critical for consistency):
- binary_score: 0.2 (low temperature for deterministic scoring)
- fix_plan: 0.3 (balanced for creative fixes)
- agent_tasks: 0.3 (balanced for task decomposition)

### JSON Schemas (Frontend-Aligned)

All schemas in `api-gateway/src/lib/schemas.ts` are aligned with frontend component expectations:

**BinaryScoreOutput**:
- Both `pass: boolean` and `status: "pass"|"fail"` (string for frontend)
- `readiness_gate.state`: "GO" | "REVISE" | "HOLD" (uppercase for Badge components)
- Optional `prd_title` for display
- Compliance gaps tracking
- Optional inter-evaluator agreement stats

**FixPlanOutput**:
- `priority`: "P0" | "P1" | "P2" (strings, not numbers)
- `owner`: freeform string (e.g., "PM + Eng Lead")
- `blocking`: boolean (instead of `gating`)
- `description`: string (instead of `rationale`)
- `linked_criteria`: array of C1-C11 IDs

**AgentTasksOutput**:
- `feature`: string for grouping (e.g., "F2.1 Alert Ingestion")
- `title`: string (not `name`)
- `description`: string
- `duration`: string (e.g., "2h") + `est_hours`: number
- `entry`, `exit`, `test`: single strings for display
- Optional arrays: `entry_conditions`, `exit_conditions`, `tests` for programmatic use
- `status`: "ready" | "blocked" | "in_progress" | "completed"

### Anthropic Claude Integration

**Core Configuration**:
- SDK: `@anthropic-ai/sdk` with streaming + structured outputs (beta: structured-outputs-2025-11-13)
- Model: `claude-sonnet-4-5-20250929` (env: `EVALPRD_MODEL`)
- **Temperature**: 0.2 (binary_score), 0.3 (fix_plan, agent_tasks) - critical for consistency
- Max tokens: 60000 (provides buffer below 64k hard limit)
- Timeout: 180000ms (3 minutes) per API call
- Validation: Ajv validates all outputs against JSON schemas
- Retry: Max 1 retry on transient errors

**Streaming Flow**:
1. Client → API Gateway: POST with prd_text
2. API Gateway → Anthropic: Streaming request with JSON Schema
3. Anthropic → Client: SSE delta events every 50-200ms + 15s heartbeat
4. Final: Validated JSON matching schema exactly

**Performance**: Time-to-first-byte <200ms (vs 7-30s before), ~40-60% perceived latency improvement

### API Gateway Endpoints

- **POST /api/evalprd/binary_score** - Binary PASS/FAIL scoring (SSE stream)
- **POST /api/evalprd/fix_plan** - Prioritized fix plan (SSE stream)
- **POST /api/evalprd/agent_tasks** - Executable task DAG (SSE stream)
- **GET /health** - Health check
- **Server**: Fastify with CORS, rate limiting (60 req/min default), Pino JSON logging
- **Port**: 8080 (env: `PORT`)
- **CORS**: Allowlist via `ALLOWED_ORIGIN` (default: http://localhost:3000)

## Frontend

### Technology Stack
- **React 18.3.1** with TypeScript
- **Vite 6.3.5** with React SWC plugin
- **Tailwind CSS v4** (native CSS layer syntax, not PostCSS)
- **Radix UI** primitives
- **shadcn/ui** component patterns
- **Lucide React** icons
- Dev server: port 3000

### Component Structure
- **Page Components**: Hero, Features, ExampleOutput, FixPlanExample, AgentTasksExample, CTASection
- **UI Components**: `src/components/ui/*` (Radix-based primitives)
- **Upload Flow**: UploadDialog → API call → scroll to results

### Design System
- Typography: Figtree font family
- Colors: Semantic tokens (primary, muted, destructive, chart-*)
- Status colors: Green (`chart-2`) for PASS, Red (`destructive`) for FAIL
- Priority colors: Red for P0, Yellow for P1, Gray for P2
- Cards: Rounded corners via `--radius-card`, shadows via `--elevation-sm`

### State Management
- `App.tsx` manages upload dialog and results visibility
- Upload completion triggers scroll to `#results` section
- API client (`lib/api.ts`) handles SSE streaming with timeout (600000ms / 10 minutes)
- PDF parsing via `lib/fileReader.ts` using pdfjs-dist
- Export functions (`lib/exportMarkdown.ts`) generate Markdown/JSON downloads

## Testing

**Test Fixtures**:
- `data/sample_prd.md` - Example PRD
- `data/*.pdf` - Real sample PRDs
- `tests/fixtures/` - Additional test cases
- `tests/golden/spotify/` - Golden outputs (expected-score.json, expected-fix-plan.json, expected-agent-tasks.json)

**Integration Tests** (see `tests/MANUAL_TEST_INSTRUCTIONS.md` for details):
- `tests/test-full-flow-automated.js` - End-to-end automated test (all 3 endpoints)
- `tests/test-production-rendering.js` - UI rendering validation
- Validates: Schema compliance, readiness gate logic, gating failures, task constraints

## Environment Variables

**API Gateway** (api-gateway/.env):
```bash
ANTHROPIC_API_KEY=sk-ant-...        # Required: Anthropic API key
EVALPRD_MODEL=claude-sonnet-4-5-20250929  # Optional: Model override
PORT=8080                           # Optional: Server port
ALLOWED_ORIGIN=http://localhost:3000      # Optional: CORS origin
LOG_LEVEL=info                      # Optional: Logging level
RATE_LIMIT_MAX=60                   # Optional: Rate limit (req/min)
RATE_LIMIT_WINDOW_MS=60000          # Optional: Rate limit window (ms)
```

**Security**:
- Never commit `.env` files or log PRD content (use hashes for debugging)
- For App Engine: Set `ANTHROPIC_API_KEY` in `cloud/app.local.yaml` (git-ignored)
- CORS: Enforce origin allowlist via `ALLOWED_ORIGIN`
- Rate limiting: 60 req/min default
- Timeouts: Backend 180s (Claude API), Frontend 600s (complete flow)
- SSE heartbeat: 15s keepalive prevents App Engine 60s timeout

## Common Development Tasks

### Adding a New Criterion (e.g., C12)
1. Update `RUBRIC_CRITERIA` in `api-gateway/src/lib/rubric.ts`
2. Update criterion ID regex in `api-gateway/src/lib/schemas.ts` (e.g., `^C([1-9]|1[0-2])$`)
3. Add detailed definition to system prompt in `api-gateway/src/lib/prompts.ts`
4. Update frontend example data in `frontend/src/components/ExampleOutput.tsx`
5. Update golden test expectations in `tests/golden/spotify/`

### Modifying Evaluation Output Schema
1. Update JSON schema in `api-gateway/src/lib/schemas.ts`
2. Update TypeScript types in `api-gateway/src/types.ts` (if needed)
3. Update evaluator-specific prompt in `api-gateway/src/lib/prompts.ts`
4. Update frontend components consuming the data
5. Run `cd tests && node test-full-flow-automated.js` to verify

## Deployment (Google App Engine)

**Architecture**: Two services at evalgpt.com
- `api` service (api-gateway/) → /api/* endpoints
- `default` service (frontend/) → /* static SPA

**Deployment** (see `cloud/DEPLOY_APP_ENGINE.md` for full instructions):
```bash
# 1. Build locally
cd api-gateway && npm run build
cd ../frontend && npm run build

# 2. Create cloud/app.local.yaml with ANTHROPIC_API_KEY (git-ignored)
# 3. Deploy
gcloud app deploy cloud/app.yaml cloud/app.local.yaml --quiet
gcloud app deploy cloud/dispatch.yaml --quiet

# 4. Verify
curl https://evalgpt.com/api/health
```

**Monitoring**: Google Cloud Logging + Pino structured logs
**Autoscaling**: 0-10 instances, target CPU 65%

## Important Notes

- Never use phrase "quick wins" (per EvalGPT system prompt)
- Readiness gate states must be uppercase: "GO", "REVISE", "HOLD"
- Priority strings must be "P0", "P1", "P2" (not numbers)
- Task durations must be strings like "2h", "4h" (not just numbers)
- Always validate outputs with Ajv before returning from evaluators
- Model: claude-sonnet-4-5-20250929 (Claude Sonnet 4.5)
- Critical: Temperature = 0.2 for binary_score, 0.3 for fix_plan/agent_tasks (consistency)

## Custom GPT Parity

This system replicates the EvalPRD custom GPT with 100% fidelity:

### Critical Success Factors

**1. Complete Rubric Embedding** (`api-gateway/src/lib/rubric-definitions.ts` + `prompts.ts`)
- All 11 criterion definitions with detailed PASS/FAIL criteria
- Real-world examples: WestREC (PASS patterns), Spring Health (FAIL patterns), Apex Health (scope explosion)
- Failure mode taxonomy and GxP overlay injected into system prompt

**2. Temperature Control** (essential for consistency)
- binary_score: 0.2 (deterministic scoring)
- fix_plan: 0.3 (balanced creativity)
- agent_tasks: 0.3 (balanced decomposition)

**3. Golden Test Outputs** (`tests/golden/spotify/`)
- expected-score.json: 2 PASS / 9 FAIL, HOLD gate
- expected-fix-plan.json: 10 prioritized fixes
- expected-agent-tasks.json: 10 executable tasks with DAG
- Used for regression testing (3 consecutive runs should produce identical results)

### Frontend Display Components

**Complete Data Rendering**:
- `ScoreDisplay.tsx` - All 11 criteria with evidence quotes, pass/fail badges
- `ReadinessGateDisplay.tsx` - GO/REVISE/HOLD decision with reason
- `FixPlanDisplay.tsx` - All fixes with P0/P1/P2 priorities, owners, effort, impact
- `AgentTasksDisplay.tsx` - All tasks with inputs/outputs, entry/exit conditions, tests, dependencies
- `EvaluationResults.tsx` - Unified results page with tabs and Markdown/JSON export

**Design Tokens** (`frontend/src/index.css`):
- Success: `chart-2` (green), Error: `destructive` (red), Warning: `chart-4` (yellow)
- Cards: `rounded-[var(--radius-card)]`, Shadows: `shadow-[var(--elevation-sm)]`
