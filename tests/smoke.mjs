import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const runtime = spawn(
  resolve(root, "judge-runtime/.venv/bin/uvicorn"),
  ["app.main:app", "--host", "127.0.0.1", "--port", "8092"],
  {
    cwd: resolve(root, "judge-runtime"),
    env: { ...process.env, JUDGE_RUNTIME_MODE: "fixture", LOG_LEVEL: "WARNING" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const gateway = spawn("node", ["dist/server.js"], {
  cwd: resolve(root, "api-gateway"),
  env: {
    ...process.env,
    PORT: "8080",
    PRD_JUDGE_RUNTIME_URL: "http://127.0.0.1:8092",
    ALLOWED_ORIGIN: "http://localhost:3000",
    LOG_LEVEL: "error",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitFor(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch {
      // Services are still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error("Timed out waiting for " + url);
}

try {
  await waitFor("http://127.0.0.1:8092/health");
  const health = await waitFor("http://127.0.0.1:8080/api/health");
  assert.equal(health.status, 200);

  const body = await readFile(resolve(root, "tests/fixtures/sample-prd.md"));
  const form = new FormData();
  form.append("prd", new Blob([body], { type: "text/markdown" }), "sample-prd.md");
  const response = await fetch("http://127.0.0.1:8080/api/prd-judge/evaluate", {
    method: "POST",
    body: form,
    headers: { Accept: "text/event-stream" },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
  const stream = await response.text();
  assert.match(stream, /event: progress/);
  assert.match(stream, /event: complete/);
  assert.match(stream, /"schema_version":"evalgpt-prd-judge\/v1"/);
  assert.match(stream, /"ephemeral":true/);
  assert.match(stream, /"used_quotes_verified":true/);

  for (const path of ["/api/auth/session", "/api/payments/create-checkout", "/api/evaluations"]) {
    const removed = await fetch("http://127.0.0.1:8080" + path);
    assert.equal(removed.status, 404);
  }
  process.stdout.write("Full fixture-backed PRD Judge smoke test passed.\n");
} finally {
  gateway.kill("SIGTERM");
  runtime.kill("SIGTERM");
}
