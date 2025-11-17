# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EvalPRD as a Service - A PRD evaluation platform that analyzes Product Requirements Documents against 11 critical criteria, providing binary PASS/FAIL scoring, prioritized fix plans, and AI agent-executable task graphs.

## Architecture

This is a full-stack application with two main components:

1. **Frontend** (React + Vite + TypeScript) - Landing page and evaluation UI
2. **API Gateway** (Fastify + Anthropic Claude) - HTTP endpoints for evaluation powered by Claude Sonnet 4.5

**Architecture Evolution**:
- **Previous**: MCP server subprocess pattern (complex, required stdio communication)
- **Current**: Direct Anthropic SDK integration with streaming + structured outputs
- **Benefits**: Eliminated process management overhead, improved reliability, real-time streaming

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

### API Gateway
```bash
cd api-gateway
npm install
cp .env.example .env      # Fill in ANTHROPIC_API_KEY
npm run dev               # Development mode (port 8080)
npm run build             # Production build
npm run type-check        # TypeScript check
npm start                 # Production server (node dist/server.js)
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # Vite dev server (port 3000, auto-open)
npm run build             # Production build to build/
npm start                 # Serve production build (serve -s build -l $PORT)
npm run generate-spotify-results  # Generate example data from golden tests
```

### All Services (Development)
```bash
# Terminal 1: API Gateway
cd api-gateway && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
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

- Uses Anthropic Messages API with **streaming + structured outputs** (beta: structured-outputs-2025-11-13)
- Model: `claude-sonnet-4-5-20250929` (configurable via `EVALPRD_MODEL` env var)
- Temperature: 0.2 for binary_score, 0.3 for fix_plan/agent_tasks
- Max tokens: 60000 (below Claude Sonnet 4.5's 64k limit, provides buffer for complex PRDs)
- Timeout: 180000ms (3 minutes) for backend API calls
- Validation: Ajv validates all outputs against schemas
- Error handling: Max 1 retry on transient errors
- Logging: Pino JSON logs with request IDs, latency, token usage (never logs PRD content)
- **Streaming**: Real-time delta events every 50-200ms, final validated JSON on completion

## API Gateway

- **Fastify** server with CORS and rate limiting
- Direct Anthropic SDK integration (@anthropic-ai/sdk)
- Three **streaming** endpoints (Server-Sent Events):
  - `POST /api/evalprd/binary_score` - Returns SSE stream with delta + done events
  - `POST /api/evalprd/fix_plan` - Returns SSE stream with delta + done events
  - `POST /api/evalprd/agent_tasks` - Returns SSE stream with delta + done events
- `GET /health` for healthchecks
- Rate limit: 60 req/min (configurable via `RATE_LIMIT_MAX`)
- Origin allowlist: Configured via `ALLOWED_ORIGIN` env var (default: http://localhost:3000)
- Port: 8080 (default, configurable via `PORT`)
- Heartbeat: 15s SSE keepalive to prevent App Engine 60s timeout

### Streaming Architecture (Claude Sonnet 4.5)

Claude Sonnet 4.5's beta feature (structured-outputs-2025-11-13) combines streaming with structured outputs:

- **Client → API Gateway**: POST request with prd_text
- **API Gateway → Anthropic**: Streaming request with JSON Schema
- **Anthropic → API Gateway**: Delta chunks every 50-200ms
- **API Gateway → Client**: SSE events forwarding deltas + heartbeat every 15s
- **Final**: Complete validated JSON matching schema exactly

**Benefits**:
- Time to first byte: <200ms (vs 7-30s before)
- Perceived latency: ~40-60% improvement
- Real-time progress feedback
- Guaranteed valid JSON at completion
- No reliability tradeoff

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

### Test Fixtures
- `data/sample_prd.md` - Example PRD for testing
- `data/*.pdf` - Real sample PRDs
- `tests/fixtures/` - Additional test cases
- `tests/contracts/` - Golden test outputs for CI

### Integration Tests
- Manual test scripts: `tests/test-*.js` and `tests/test-*.html`
- `tests/test-full-flow-automated.js` - End-to-end automated testing
- `tests/test-production-rendering.js` - Production UI rendering tests
- `tests/MANUAL_TEST_INSTRUCTIONS.md` - Detailed testing guide
- Validate all three endpoints return valid JSON matching schemas
- Verify readiness gate logic, gating failures, task constraints

## Security & Operations

- **Environment Variables**: Never commit `.env` files, use `.env.example` as template
- **Secrets**: ANTHROPIC_API_KEY must be set (use `app.local.yaml` for App Engine, git-ignored)
- **Logging**: Never log PRD content (use hash for debugging), Pino JSON logs for structured output
- **CORS**: Enforce origin allowlist via `ALLOWED_ORIGIN` env var
- **Rate Limiting**: 60 req/min default (configurable via `RATE_LIMIT_MAX`)
- **Timeouts**: Backend 180s (3min) for Claude API calls, Frontend 600s (10min) for complete evaluation flow
- **App Engine**: 15s SSE heartbeat required to prevent 60s connection timeout
- **Token Limits**: Claude Sonnet 4.5 max_tokens set to 60,000 (below 64k hard limit for safety buffer)

## Common Development Tasks

### Adding a New Criterion
1. Update `RUBRIC_CRITERIA` in `api-gateway/src/lib/rubric.ts`
2. Update schemas in `api-gateway/src/lib/schemas.ts` (pattern regex)
3. Update system prompt in `api-gateway/src/lib/prompts.ts`
4. Update frontend example data in `frontend/src/components/ExampleOutput.tsx`

### Modifying Evaluation Output Format
1. Update schema in `api-gateway/src/lib/schemas.ts`
2. Update TypeScript types in `api-gateway/src/types.ts`
3. Update evaluator-specific prompt appender in `api-gateway/src/lib/prompts.ts`
4. Update frontend components to consume new format
5. Run integration tests to verify

### Connecting Frontend to Real API
1. Create TypeScript types in `frontend/src/types/`
2. Update `UploadDialog.tsx` to POST PRD text to `/api/evalprd/binary_score`
3. Update example components to render API response data
4. Add loading states and error handling

## Deployment

**Google App Engine** (Current platform):
- Two services architecture:
  - `api` service (api-gateway/) - API endpoints at /api/*
  - `default` service (frontend/) - Static SPA at /*
- Routing: `cloud/dispatch.yaml` routes evalgpt.com traffic between services
- Deployment configs: `cloud/app.yaml` with `cloud/app.local.yaml` secrets overlay (git-ignored)
- Deploy: `gcloud app deploy cloud/app.yaml cloud/app.local.yaml --quiet`
- Secrets: Set ANTHROPIC_API_KEY in `app.local.yaml` (never commit)
- Domain: evalgpt.com (configured via dispatch.yaml)
- Monitoring: Google Cloud Logging + Pino structured logs
- Autoscaling: App Engine automatic scaling (0-10 instances, target CPU 65%)

**Deployment Steps**:
1. Build both services locally first
2. Deploy API service with secrets overlay
3. Deploy frontend service
4. Deploy dispatch rules
5. Verify via `gcloud app browse` and health checks

See `cloud/DEPLOY_APP_ENGINE.md` for detailed instructions.

## Important Notes

- Never use phrase "quick wins" (per EvalGPT system prompt)
- Readiness gate states must be uppercase: "GO", "REVISE", "HOLD"
- Priority strings must be "P0", "P1", "P2" (not numbers)
- Task durations must be strings like "2h", "4h" (not just numbers)
- Always validate outputs with Ajv before returning from evaluators
- Model: claude-sonnet-4-5-20250929 (Claude Sonnet 4.5)
- Critical: Temperature = 0.2 for binary_score, 0.3 for fix_plan/agent_tasks (consistency)

## Custom GPT Parity

This system achieves 100% parity with the EvalPRD custom GPT through:

### 1. Complete Rubric Embedding

The custom GPT has access to the full rubric document (`Copy of PRD LLM-as-judge Eval (PUBLIC).md`). We replicate this by:
- Extracting all 11 criterion definitions into `api-gateway/src/lib/rubric-definitions.ts`
- Including detailed PASS criteria and FAIL indicators for each criterion
- Embedding real-world examples (WestREC PASS, Spring Health FAIL, Apex Health scope explosion)
- Adding failure mode taxonomy
- Injecting all of this into the system prompt via template literals in `api-gateway/src/lib/prompts.ts`

### 2. Temperature Configuration

**Critical for output consistency**:
- `binary_score`: temperature = 0.2 (deterministic scoring)
- `fix_plan`: temperature = 0.3 (balanced creativity)
- `agent_tasks`: temperature = 0.3 (balanced decomposition)

Previous bug: All tools were using temperature = 1.0 (maximum randomness), causing high variance.

### 3. Golden Test Files

Located in `tests/golden/spotify/`:
- `expected-score.json` - Binary score (2 PASS / 9 FAIL, HOLD gate)
- `expected-fix-plan.json` - 10 prioritized fix items
- `expected-agent-tasks.json` - 10 executable tasks with dependencies
- `expected-readiness.json` - Readiness gate decision

These files represent the ground truth from `tests/sitevsgpt/*.md` and are used for regression testing.

### 4. Frontend Display Completeness

All evaluation data must be visible in the UI:

**Components**:
- `ScoreDisplay.tsx` - Shows all 11 criteria with evidence quotes, pass/fail badges, gating failures
- `ReadinessGateDisplay.tsx` - Shows gate decision (GO/REVISE/HOLD) with reason and must-pass status
- `FixPlanDisplay.tsx` - Shows all fix items with priorities, owners, effort, impact, acceptance tests
- `AgentTasksDisplay.tsx` - Shows all tasks with inputs, outputs, entry/exit conditions, tests, dependencies, error handling
- `EvaluationResults.tsx` - Unified results page with tabs and export functions

**Data Flow**:
1. User uploads PRD → `UploadDialog.tsx`
2. Calls all 3 APIs sequentially: binary_score, fix_plan, agent_tasks
3. Stores all results in state
4. Displays via `EvaluationResults.tsx` with complete data rendering
5. Export functions generate Markdown and JSON downloads

### 5. Design System Consistency

**Color Tokens** (from `globals.css`):
- Success/Green: `chart-2` (rgba(13, 148, 136, 1))
- Error/Red: `destructive` (rgba(220, 38, 38, 1))
- Warning/Yellow: `chart-4` (rgba(251, 191, 36, 1))
- Primary Blue: `primary` (rgba(0, 85, 212, 1))
- Muted Gray: `muted` and `muted-foreground`

**Patterns**:
- Cards: `rounded-[var(--radius-card)] border border-border bg-card`
- Shadows: `shadow-[var(--elevation-sm)]`
- Sections: `py-20` for vertical spacing
- Badges: Use `variant="outline"` with custom className for colored badges

### 6. Testing Protocol

**Regression Testing**:
```bash
# Test backend outputs match golden files
cd tests/golden/spotify
# Run SpotifyPRD through all 3 tools
# Compare outputs to expected-*.json files
# Verify binary decisions match (C1-C11 PASS/FAIL)
# Verify priorities match (P0/P1/P2)
# Verify readiness gate matches (HOLD)
```

**Frontend Testing**:
```bash
# Start dev server
cd frontend && npm run dev

# Upload SpotifyPRD.pdf
# Verify all 11 criteria display
# Verify readiness gate shows "HOLD"
# Verify all fix plan items render
# Verify all agent tasks render
# Verify export functions work
```

### 7. Validation Checklist

Before claiming parity, verify:

**Backend**:
- [ ] Temperature = 0.2 (binary_score), 0.3 (fix_plan, agent_tasks)
- [ ] Full rubric definitions embedded in system prompt
- [ ] 3 consecutive runs of same PRD produce identical outputs
- [ ] SpotifyPRD scores match tests/sitevsgpt/score.md (2 PASS, 9 FAIL)
- [ ] Readiness gate = HOLD with correct reason

**Frontend**:
- [ ] All 11 criteria render with evidence quotes
- [ ] Readiness gate badge shows correct state with proper colors
- [ ] All fix plan items display with P0/P1/P2 badges
- [ ] All agent tasks show inputs/outputs/tests/deps/errors
- [ ] No "undefined" or missing data in UI
- [ ] Export to Markdown produces readable file
- [ ] Export to JSON is valid and complete

**End-to-End**:
- [ ] Upload SpotifyPRD → complete evaluation in < 3 minutes
- [ ] Results match custom GPT output structure
- [ ] All tabs navigate correctly
- [ ] Collapsible sections expand/collapse
- [ ] Visual design matches existing components
