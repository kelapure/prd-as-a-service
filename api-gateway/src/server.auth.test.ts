import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { fetch, FormData, Response } from "undici";

import {
  WorkspaceAuthError,
  type WorkspaceTokenVerifier,
} from "./auth.js";
import {
  InMemoryQuotaStore,
  QuotaError,
  type QuotaStore,
} from "./quota.js";
import { buildServer } from "./server.js";


function verifier(): WorkspaceTokenVerifier {
  return {
    async verify(token) {
      if (token === "valid-token") {
        return { sub: "subject-1", email: "person@8090.inc", domain: "8090.inc" };
      }
      if (token === "external-token") {
        throw new WorkspaceAuthError(
          "workspace_not_allowed",
          "EvalGPT is available only to verified @8090.inc Google Workspace accounts.",
          403,
        );
      }
      if (token === "expired-token") {
        throw new WorkspaceAuthError(
          "token_expired",
          "Your Google sign-in expired. Sign in again to continue.",
          401,
        );
      }
      throw new WorkspaceAuthError("auth_required", "The Google sign-in token is invalid.", 401);
    },
  };
}

function healthyRuntimeFetch(): typeof fetch {
  return async (url) =>
    new Response(
      JSON.stringify(
        String(url).endsWith("/health")
          ? { status: "ok", configured: true, prd_score_enabled: true }
          : { detail: "synthetic upstream rejection" },
      ),
      {
        status: String(url).endsWith("/health") ? 200 : 503,
        headers: { "content-type": "application/json" },
      },
    );
}

test("anonymous and external uploads are rejected before multipart parsing or runtime access", async () => {
  let runtimeCalls = 0;
  const server = await buildServer({
    authRequired: true,
    verifyIdentity: verifier(),
    quotaStore: new InMemoryQuotaStore(),
    runtimeFetch: async () => {
      runtimeCalls += 1;
      return new Response("unexpected");
    },
  });
  try {
    for (const expected of [
      { authorization: undefined, status: 401, code: "auth_required" },
      { authorization: "Bearer external-token", status: 403, code: "workspace_not_allowed" },
      { authorization: "Bearer expired-token", status: 401, code: "token_expired" },
    ]) {
      const response = await server.inject({
        method: "POST",
        url: "/api/prd-judge/evaluate",
        headers: {
          "content-type": "multipart/form-data; boundary=not-closed",
          ...(expected.authorization ? { authorization: expected.authorization } : {}),
        },
        payload: "this is deliberately malformed multipart content",
      });
      assert.equal(response.statusCode, expected.status);
      assert.equal(response.json().code, expected.code);
    }
    assert.equal(runtimeCalls, 0);
  } finally {
    await server.close();
  }
});

test("access returns only the signed-in work email and durable quota status", async () => {
  const store = new InMemoryQuotaStore();
  const now = new Date("2026-07-24T12:00:00.000Z");
  const first = await store.reserve("subject-1", now);
  await store.release(first.leaseId, now);
  const server = await buildServer({
    authRequired: true,
    verifyIdentity: verifier(),
    quotaStore: store,
    now: () => now,
    runtimeFetch: healthyRuntimeFetch(),
  });
  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/access",
      headers: { authorization: "Bearer valid-token" },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      access: "allowed",
      identity: { email: "person@8090.inc" },
      quota: {
        daily: {
          limit: 3,
          used: 1,
          remaining: 2,
          resetsAt: "2026-07-25T00:00:00.000Z",
        },
        monthly: {
          limit: 10,
          used: 1,
          remaining: 9,
          resetsAt: "2026-08-01T00:00:00.000Z",
        },
      },
    });
  } finally {
    await server.close();
  }
});

test("quota failures have stable codes and Retry-After headers", async () => {
  const quotaStore: QuotaStore = {
    async snapshot() {
      throw new QuotaError("quota_store_unavailable", "Quota unavailable", {
        retryAfterSeconds: 60,
      });
    },
    async reserve() {
      throw new QuotaError("daily_limit_reached", "Daily limit reached", {
        retryAfterSeconds: 43,
      });
    },
    async release() {},
    async health() {},
  };
  const server = await buildServer({
    authRequired: true,
    verifyIdentity: verifier(),
    quotaStore,
    runtimeFetch: healthyRuntimeFetch(),
  });
  try {
    const access = await server.inject({
      method: "GET",
      url: "/api/access",
      headers: { authorization: "Bearer valid-token" },
    });
    assert.equal(access.statusCode, 503);
    assert.equal(access.json().code, "quota_store_unavailable");
    assert.equal(access.headers["retry-after"], "60");

    const formBoundary = "quota-test";
    const evaluation = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": `multipart/form-data; boundary=${formBoundary}`,
      },
      payload: [
        `--${formBoundary}`,
        'Content-Disposition: form-data; name="prd_text"',
        "",
        "A valid synthetic PRD body long enough to pass the gateway input check.",
        `--${formBoundary}--`,
        "",
      ].join("\r\n"),
    });
    assert.equal(evaluation.statusCode, 429);
    assert.equal(evaluation.json().code, "daily_limit_reached");
    assert.equal(evaluation.headers["retry-after"], "43");
  } finally {
    await server.close();
  }
});

test("mandatory PRD Score is checked before an evaluation consumes quota", async () => {
  let reservations = 0;
  const quotaStore: QuotaStore = {
    async snapshot() {
      return {
        daily: { limit: 3, used: 0, remaining: 3, resetsAt: "2026-07-25T00:00:00.000Z" },
        monthly: { limit: 10, used: 0, remaining: 10, resetsAt: "2026-08-01T00:00:00.000Z" },
      };
    },
    async reserve() {
      reservations += 1;
      return {
        leaseId: "unexpected",
        quota: await this.snapshot("subject-1"),
      };
    },
    async release() {},
    async health() {},
  };
  const server = await buildServer({
    authRequired: true,
    verifyIdentity: verifier(),
    quotaStore,
    runtimeFetch: async () => new Response(
      JSON.stringify({ status: "ok", configured: true, prd_score_enabled: false }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  });
  try {
    const boundary = "score-required";
    const response = await server.inject({
      method: "POST",
      url: "/api/prd-judge/evaluate",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: [
        `--${boundary}`,
        'Content-Disposition: form-data; name="prd_text"',
        "",
        "A valid synthetic PRD body for the mandatory score health gate.",
        `--${boundary}--`,
        "",
      ].join("\r\n"),
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, "approved_runtime_unavailable");
    assert.equal(reservations, 0);
  } finally {
    await server.close();
  }
});

test("downstream failure consumes one admitted start and always releases concurrency", async () => {
  const store = new InMemoryQuotaStore({ concurrent: 1 });
  const now = new Date("2026-07-24T12:00:00.000Z");
  const server = await buildServer({
    authRequired: true,
    verifyIdentity: verifier(),
    quotaStore: store,
    now: () => now,
    runtimeFetch: healthyRuntimeFetch(),
  });
  await server.listen({ host: "127.0.0.1", port: 0 });
  try {
    const { port } = server.server.address() as AddressInfo;
    for (let run = 0; run < 2; run += 1) {
      const form = new FormData();
      form.append("prd_text", `Synthetic PRD body for admitted downstream failure number ${run}.`);
      const response = await fetch(`http://127.0.0.1:${port}/api/prd-judge/evaluate`, {
        method: "POST",
        headers: { authorization: "Bearer valid-token" },
        body: form,
      });
      assert.equal(response.status, 503);
    }
    const quota = await store.snapshot("subject-1", now);
    assert.equal(quota.daily.used, 2);
  } finally {
    await server.close();
  }
});
