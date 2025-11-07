# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` — React + Vite UI; entry `src/App.tsx`, assets in `public/`, builds to `build/`.
- `api-gateway/` — Fastify TypeScript HTTP server bridging to MCP; entry `src/server.ts`.
- `mcp-server/` — MCP server with tools in `src/tools/` (`binary_score.ts`, `fix_plan.ts`, `agent_tasks.ts`).
- `infra/` — Dockerfiles and `docker-compose.yml` for local stack.
- `data/` — Sample PRDs; `tests/` — add integration tests, use `fixtures/` and `contracts/`.

## Build, Test, and Development Commands
- Per package (run inside `frontend/`, `api-gateway/`, `mcp-server/`):
  - Install: `npm install`
  - Dev: `npm run dev` (frontend → `:3000`, gateway → `:8080`, MCP via `ts-node`).
  - Build: `npm run build`; Start (Node services): `npm start`
  - Type-check: `npm run type-check`
- All services via Docker: `cp .env.example .env && docker-compose -f infra/docker-compose.yml up`
- Smoke tests:
  - Health: `curl -s localhost:8080/health`
  - Binary score: `curl -X POST localhost:8080/api/evalprd/binary_score -H 'Content-Type: application/json' --data @test-request.json`

## Coding Style & Naming Conventions
- TypeScript strict mode; 2-space indentation; ES modules.
- Names: variables/functions `camelCase`; types/interfaces and React components `PascalCase`.
- Tools use `snake_case` in `mcp-server/src/tools/` to match API contract.
- No linter configured; keep imports tidy and prefer explicit types at module boundaries.

## Testing Guidelines
- No formal runner yet. Place integration tests under `tests/`; fixtures in `tests/fixtures/`.
- Cover the three endpoints (happy/negative paths) and schema shape of responses.
- Validate locally with the curl examples above and `npm run type-check` in both Node services.

## Commit & Pull Request Guidelines
- Git history lacks a convention; use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- PRs should include: clear description, linked issues, repro steps, backend logs or UI screenshots, and updates to `README.md`/`.env.example` if envs change.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (see root `.env.example`) and restrict `ALLOWED_ORIGIN` in production.
- Require Node `>=20`. Keep rate limits configured in the gateway and avoid expanding public endpoints without auth.

## Agent-Specific Instructions
- Keep changes minimal and scoped; follow directory and naming conventions.
- If you change commands, env vars, or API contracts, update `README.md` and examples in the same PR.
