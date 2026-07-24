import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { IdTokenClient } from "google-auth-library";
import { fetch, FormData, Response } from "undici";

import { buildServer, idTokenClientForAudience } from "./server.js";

function healthyRuntimeFetch() {
  return async () =>
    new Response(JSON.stringify({ status: "ok", configured: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
}


test("health reports the pinned runtime without persistence routes", async () => {
  const server = await buildServer({
    authRequired: false,
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
    assert.equal(removed.statusCode, 404, `${url} must not be reachable`);
  }
  await server.close();
});


test("health fails closed when no validated runtime is available", async () => {
  const server = await buildServer({
    authRequired: false,
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
      authRequired: false,
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


test("evaluation rate limiting keys on the App Engine client IP and ignores spoofed forwarding entries", async () => {
  const previousHops = process.env.TRUST_PROXY_HOPS;
  const previousMax = process.env.RATE_LIMIT_MAX;
  process.env.TRUST_PROXY_HOPS = "2";
  process.env.RATE_LIMIT_MAX = "1";
  try {
    const server = await buildServer({ authRequired: false, runtimeFetch: healthyRuntimeFetch() });
    const first = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: {
        "content-type": "multipart/form-data; boundary=x",
        "x-forwarded-for": "6.6.6.6, 203.0.113.5, 169.254.1.1",
      },
      payload: "--x--\r\n",
    });
    assert.equal(first.statusCode, 400);
    const spoofedRetry = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.5, 169.254.1.1" },
      payload: "--x--\r\n",
    });
    assert.equal(spoofedRetry.statusCode, 429, "a spoofed leftmost entry must not rotate the rate-limit key");
    const otherClient = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: {
        "content-type": "multipart/form-data; boundary=x",
        "x-forwarded-for": "6.6.6.6, 198.51.100.7, 169.254.1.1",
      },
      payload: "--x--\r\n",
    });
    assert.equal(otherClient.statusCode, 400, "a different real client must get its own rate-limit budget");
    const health = await server.inject({ method: "GET", url: "/api/health" });
    assert.equal(health.statusCode, 200, "health checks must be excluded from route rate limits");
    await server.close();
  } finally {
    if (previousHops === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = previousHops;
    if (previousMax === undefined) delete process.env.RATE_LIMIT_MAX;
    else process.env.RATE_LIMIT_MAX = previousMax;
  }
});


test("forwarded headers are ignored by the evaluation limiter when proxy trust is not configured", async () => {
  const previousMax = process.env.RATE_LIMIT_MAX;
  process.env.RATE_LIMIT_MAX = "1";
  try {
    const server = await buildServer({ authRequired: false, runtimeFetch: healthyRuntimeFetch() });
    const first = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: {
        "content-type": "multipart/form-data; boundary=x",
        "x-forwarded-for": "203.0.113.5",
      },
      payload: "--x--\r\n",
    });
    assert.equal(first.statusCode, 400);
    const forged = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: {
        "content-type": "multipart/form-data; boundary=x",
        "x-forwarded-for": "198.51.100.7",
      },
      payload: "--x--\r\n",
    });
    assert.equal(forged.statusCode, 429, "an untrusted forwarded header must not bypass the socket-keyed limit");
    await server.close();
  } finally {
    if (previousMax === undefined) delete process.env.RATE_LIMIT_MAX;
    else process.env.RATE_LIMIT_MAX = previousMax;
  }
});


test("the Google identity client is cached per audience and retried after failure", async () => {
  let created = 0;
  const fakeClient = {} as IdTokenClient;
  const factory = async () => {
    created += 1;
    return fakeClient;
  };
  const first = await idTokenClientForAudience("https://runtime.cached.example", factory);
  const second = await idTokenClientForAudience("https://runtime.cached.example", factory);
  assert.equal(created, 1, "repeat requests must reuse the cached identity client");
  assert.equal(first, second);

  let failures = 0;
  const failingFactory = async (): Promise<IdTokenClient> => {
    failures += 1;
    throw new Error("metadata server unavailable");
  };
  await assert.rejects(idTokenClientForAudience("https://runtime.failing.example", failingFactory));
  await assert.rejects(idTokenClientForAudience("https://runtime.failing.example", failingFactory));
  assert.equal(failures, 2, "a failed client creation must not be cached");
});


test("the emergency kill switch rejects an evaluation before reading content", async () => {
  const previous = process.env.EVALUATIONS_ENABLED;
  process.env.EVALUATIONS_ENABLED = "false";
  try {
    const server = await buildServer({ authRequired: false });
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


test("evaluation progress reaches a real HTTP client before the runtime completes", async () => {
  const encoder = new TextEncoder();
  let runtimeEventReleased = false;
  const runtimeFetch: typeof fetch = async (url) => {
    if (String(url).endsWith("/health")) {
      return new Response(JSON.stringify({ status: "ok", configured: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(() => {
          runtimeEventReleased = true;
          controller.enqueue(
            encoder.encode(
              'event: progress\ndata: {"phase":"extracting_evidence","message":"Extracting supplied evidence"}\n\n',
            ),
          );
        }, 250);
        setTimeout(() => {
          controller.enqueue(
            encoder.encode(
              'event: error\ndata: {"code":"test_complete","message":"Test stream complete","retryable":false}\n\n',
            ),
          );
          controller.close();
        }, 500);
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };
  const server = await buildServer({ authRequired: false, runtimeFetch });
  await server.listen({ host: "127.0.0.1", port: 0 });
  try {
    const { port } = server.server.address() as AddressInfo;
    const form = new FormData();
    form.append(
      "prd_text",
      "A sufficiently long synthetic PRD body used only to prove that progress streams incrementally.",
    );
    const response = await fetch(`http://127.0.0.1:${port}/api/prd-judge/evaluate`, {
      method: "POST",
      body: form,
      headers: { Accept: "text/event-stream" },
    });
    assert.equal(response.status, 200);
    assert.ok(response.body);
    const reader = response.body!.getReader();
    const first = await reader.read();
    assert.equal(first.done, false);
    assert.match(Buffer.from(first.value).toString("utf8"), /Upload received securely/);
    assert.equal(
      runtimeEventReleased,
      false,
      "the gateway's progress event must arrive before the delayed runtime event",
    );
    while (!(await reader.read()).done) {
      // Drain the deliberately delayed test stream before closing the server.
    }
  } finally {
    await server.close();
  }
});
