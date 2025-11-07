# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EvalPRD as a Service - A PRD evaluation platform that analyzes Product Requirements Documents against 11 critical criteria, providing binary PASS/FAIL scoring, prioritized fix plans, and AI agent-executable task graphs.

## Architecture

This is a full-stack application with three main components:

1. **Frontend** (React + Vite + TypeScript) - Landing page and evaluation UI
2. **API Gateway** (Fastify + MCP Client) - HTTP endpoints for the frontend
3. **MCP Server** (Model Context Protocol) - Three evaluation tools powered by OpenAI

## Repository Structure

```
├── frontend/              # React + Vite landing page
│   ├── src/
│   │   ├── components/    # Page and UI components
│   │   └── index.css      # Tailwind v4 CSS
│   ├── package.json
│   └── vite.config.ts
├── mcp-server/            # MCP server with 3 tools
│   ├── src/
│   │   ├── tools/         # binary_score, fix_plan, agent_tasks
│   │   ├── lib/           # schemas, prompts, openai, validation, rubric, util
│   │   ├── types.ts       # TypeScript types
│   │   └── index.ts       # MCP server bootstrap
│   ├── package.json
│   └── tsconfig.json
├── api-gateway/           # HTTP→MCP bridge
│   ├── src/
│   │   └── server.ts      # Fastify server with /api/evalprd/* endpoints
│   ├── package.json
│   └── tsconfig.json
├── data/                  # Test fixtures and sample PRDs
├── tests/                 # Integration tests and golden contracts
├── infra/                 # Docker files and deployment configs
└── CLAUDE.md             # This file
```

## Development Commands

### MCP Server
```bash
cd mcp-server
npm install
cp .env.example .env      # Fill in OPENAI_API_KEY
npm run dev               # Development mode
npm run build             # Production build
npm run type-check        # TypeScript check
```

### API Gateway
```bash
cd api-gateway
npm install
cp .env.example .env
npm run dev               # Development mode
npm run build             # Production build
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # Vite dev server (port 3000)
npm run build             # Production build
```

### Docker (All services)
```bash
cp .env.example .env      # Configure environment
docker-compose -f infra/docker-compose.yml up
```

## MCP Server Architecture

### Three Tools

1. **binary_score** - PASS/FAIL evaluation of 11 criteria with evidence, compliance gaps, readiness gate
2. **fix_plan** - Prioritized fix plan with P0/P1/P2 priorities, owners, effort, impact
3. **agent_tasks** - 2-4h executable tasks with DAG dependencies, inputs/outputs, entry/exit/test conditions

### System Prompt

All tools use the exact "EvalGPT" system prompt (lib/prompts.ts) which defines:
- 11-criterion PRD rubric with PASS/FAIL scoring
- Pharma/GxP overlay (Part 11, HIPAA, ALCOA+, RBAC)
- Readiness Gates: GO (≥9/11 + gating criteria), REVISE (7-8/11), HOLD (≤6/11 or ≥3 compliance gaps)
- Gating criteria: C3 (Solution Alignment), C5 (Tech Requirements), C10 (Implementability), C11 (Agent Decomposability)

### JSON Schemas (Frontend-Aligned)

All schemas in `mcp-server/src/lib/schemas.ts` are aligned with frontend component expectations:

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

### OpenAI Integration

- Uses OpenAI Responses API with `response_format: json_schema` for strict structured outputs
- Model: `gpt-4o` (configurable via `EVALPRD_MODEL` env var)
- Temperature: 0.2 for binary_score, 0.3 for fix_plan/agent_tasks
- Validation: Ajv validates all outputs against schemas
- Error handling: Retry once on transient errors (429, 5xx)
- Logging: Pino JSON logs with request IDs, latency, token usage (never logs PRD content)

## API Gateway

- **Fastify** server with CORS and rate limiting
- Connects to MCP server via stdio transport (spawns MCP server as child process)
- Three endpoints:
  - `POST /api/evalprd/binary_score`
  - `POST /api/evalprd/fix_plan`
  - `POST /api/evalprd/agent_tasks`
- `GET /health` for healthchecks
- Rate limit: 60 req/min (configurable)
- Origin allowlist: Configured via `ALLOWED_ORIGIN` env var

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
- Example components currently use hardcoded data (to be replaced with API calls)

## Testing

### Test Fixtures
- `data/sample_prd.md` - Example PRD for testing
- `data/*.pdf` - Real sample PRDs
- `tests/fixtures/` - Additional test cases
- `tests/contracts/` - Golden test outputs for CI

### Integration Tests
- End-to-end tests in `tests/integration.mjs`
- Validate all three tools return valid JSON matching schemas
- Check readiness gate logic, gating failures, task constraints
- Verify error handling (401, 403, 502)

## Security & Operations

- **Environment Variables**: Never commit `.env` files, use `.env.example` as template
- **Secrets**: OPENAI_API_KEY must be set for mcp-server
- **Logging**: Never log PRD content (use hash for debugging)
- **CORS**: Enforce origin allowlist
- **Rate Limiting**: 60 req/min default
- **Timeouts**: 60s default for OpenAI calls

## Common Development Tasks

### Adding a New Criterion
1. Update `RUBRIC_CRITERIA` in `mcp-server/src/lib/rubric.ts`
2. Update schemas in `mcp-server/src/lib/schemas.ts` (pattern regex)
3. Update system prompt in `mcp-server/src/lib/prompts.ts`
4. Update frontend example data in `frontend/src/components/ExampleOutput.tsx`

### Modifying Tool Output Format
1. Update schema in `mcp-server/src/lib/schemas.ts`
2. Update TypeScript types in `mcp-server/src/types.ts`
3. Update tool-specific prompt appender in `mcp-server/src/lib/prompts.ts`
4. Update frontend components to consume new format
5. Run integration tests to verify

### Connecting Frontend to Real API
1. Create TypeScript types in `frontend/src/types/`
2. Update `UploadDialog.tsx` to POST PRD text to `/api/evalprd/binary_score`
3. Update example components to render API response data
4. Add loading states and error handling

## Deployment

- Docker Compose for local development (all 3 services)
- Production: Deploy mcp-server and api-gateway as separate containers
- Frontend: Build static assets, serve via nginx
- Secrets: Use secrets manager (AWS Secrets Manager, etc.)
- Monitoring: Logs via Pino → centralized logging (CloudWatch, etc.)
- Autoscaling: Scale api-gateway based on request rate

## Important Notes

- Never use phrase "quick wins" (per EvalGPT system prompt)
- Readiness gate states must be uppercase: "GO", "REVISE", "HOLD"
- Priority strings must be "P0", "P1", "P2" (not numbers)
- Task durations must be strings like "2h", "4h" (not just numbers)
- Always validate outputs with Ajv before returning from tools
- MCP server communicates via stdio transport (not HTTP)
- API gateway spawns MCP server as child process
