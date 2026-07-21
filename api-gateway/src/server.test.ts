import assert from "node:assert/strict";
import test from "node:test";
import { Response } from "undici";

import { buildServer } from "./server.js";


test("health reports the pinned runtime without auth or persistence routes", async () => {
  const server = await buildServer({
    runtimeFetch: async () =>
      new Response(
        JSON.stringify({
          status: "ok",
          configured: true,
          judge_version: "prd-judge-public-beta-v1",
          source_commit: "abc123",
          manifest_sha256: "manifest",
          model: "validated-model",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });
  const response = await server.inject({ method: "GET", url: "/api/health" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().runtime.judge_version, "prd-judge-public-beta-v1");

  for (const url of ["/api/auth/session", "/api/payments/create-checkout", "/api/evaluations"]) {
    const removed = await server.inject({ method: "GET", url });
    assert.equal(removed.statusCode, 404, `${url} must not be reachable in the anonymous beta`);
  }
  await server.close();
});


test("health fails closed when no validated runtime is available", async () => {
  const server = await buildServer({
    runtimeFetch: async () =>
      new Response(JSON.stringify({ status: "degraded", configured: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  const response = await server.inject({ method: "GET", url: "/api/health" });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().status, "degraded");
  await server.close();
});


test("preview and production origins can be allowlisted without a wildcard", async () => {
  const previous = process.env.ALLOWED_ORIGIN;
  process.env.ALLOWED_ORIGIN = "https://evalgpt.com,https://preview.example";
  try {
    const server = await buildServer({
      runtimeFetch: async () =>
        new Response(JSON.stringify({ status: "ok", configured: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    const allowed = await server.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://preview.example" },
    });
    assert.equal(allowed.headers["access-control-allow-origin"], "https://preview.example");
    const denied = await server.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://attacker.example" },
    });
    assert.equal(denied.headers["access-control-allow-origin"], undefined);
    await server.close();
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = previous;
  }
});


test("the emergency kill switch rejects an evaluation before reading content", async () => {
  const previous = process.env.EVALUATIONS_ENABLED;
  process.env.EVALUATIONS_ENABLED = "false";
  try {
    const server = await buildServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      payload: "--x--\r\n",
    });
    assert.equal(response.statusCode, 503);
    assert.match(response.json().error, /temporarily unavailable/);
    await server.close();
  } finally {
    if (previous === undefined) delete process.env.EVALUATIONS_ENABLED;
    else process.env.EVALUATIONS_ENABLED = previous;
  }
});
