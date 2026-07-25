import assert from "node:assert/strict";
import test from "node:test";

import type { LoginTicket, TokenPayload } from "google-auth-library";

import {
  bearerToken,
  createGoogleWorkspaceVerifier,
  validateWorkspaceClaims,
  WorkspaceAuthError,
} from "./auth.js";


const AUDIENCE = "client.apps.googleusercontent.com";
const NOW = new Date("2026-07-24T12:00:00.000Z");

function claims(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    iss: "https://accounts.google.com",
    aud: AUDIENCE,
    sub: "google-subject-123",
    email: "person@8090.inc",
    email_verified: true,
    hd: "8090.inc",
    exp: Math.floor(NOW.getTime() / 1000) + 3_600,
    iat: Math.floor(NOW.getTime() / 1000),
    ...overrides,
  };
}

function assertAuthError(
  operation: () => unknown,
  code: WorkspaceAuthError["code"],
  statusCode: number,
) {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof WorkspaceAuthError);
    assert.equal(error.code, code);
    assert.equal(error.statusCode, statusCode);
    return true;
  });
}

test("classifies the exact 8090 hosted domain as the unlimited internal tier", () => {
  assert.deepEqual(validateWorkspaceClaims(claims(), AUDIENCE, "8090.inc", NOW), {
    sub: "google-subject-123",
    email: "person@8090.inc",
    domain: "8090.inc",
    tier: "internal",
  });
  assert.equal(
    validateWorkspaceClaims(
      claims({ email: "verified-alias@example.com", hd: "8090.inc" }),
      AUDIENCE,
      "8090.inc",
      NOW,
    ).tier,
    "internal",
    "the signed hosted-domain claim, not the email suffix, owns membership",
  );
  assert.equal(
    validateWorkspaceClaims(
      claims({ email: "lookalike@8090.inc", hd: "external.example" }),
      AUDIENCE,
      "8090.inc",
      NOW,
    ).tier,
    "external",
  );
});

test("accepts verified Gmail and external Workspace accounts as the limited tier", () => {
  for (const payload of [
    claims({ email: "person@dfyautomation.io", hd: "dfyautomation.io" }),
    claims({ email: "person@gmail.com", hd: undefined }),
    claims({ email: "person@sub.8090.inc", hd: "sub.8090.inc" }),
  ]) {
    const identity = validateWorkspaceClaims(payload, AUDIENCE, "8090.inc", NOW);
    assert.equal(identity.tier, "external");
    assert.equal(identity.email, payload.email);
  }
});

test("rejects unverified or incomplete identities, wrong audience, issuer, and missing subject", () => {
  for (const payload of [
    claims({ email_verified: false }),
    claims({ email: undefined }),
    claims({ aud: "wrong-client.apps.googleusercontent.com" }),
    claims({ iss: "https://attacker.example" }),
    claims({ sub: "" }),
  ]) {
    assertAuthError(
      () => validateWorkspaceClaims(payload, AUDIENCE, "8090.inc", NOW),
      "auth_required",
      401,
    );
  }
  assertAuthError(
    () => validateWorkspaceClaims(
      claims({ exp: Math.floor(NOW.getTime() / 1000) - 1 }),
      AUDIENCE,
      "8090.inc",
      NOW,
    ),
    "token_expired",
    401,
  );
});

test("passes the expected audience to Google's signature verifier and rejects forged tokens", async () => {
  let received: { idToken: string; audience: string } | undefined;
  const acceptedClient = {
    async verifyIdToken(options: { idToken: string; audience: string }) {
      received = options;
      return { getPayload: () => claims() } as LoginTicket;
    },
  };
  const verifier = createGoogleWorkspaceVerifier(
    AUDIENCE,
    "8090.inc",
    acceptedClient,
    () => NOW,
  );
  assert.equal((await verifier.verify("signed-id-token")).email, "person@8090.inc");
  assert.deepEqual(received, { idToken: "signed-id-token", audience: AUDIENCE });

  const rejectingClient = {
    async verifyIdToken() {
      throw new Error("Invalid token signature");
    },
  };
  const forgedVerifier = createGoogleWorkspaceVerifier(
    AUDIENCE,
    "8090.inc",
    rejectingClient,
    () => NOW,
  );
  await assert.rejects(
    forgedVerifier.verify("forged"),
    (error: unknown) => error instanceof WorkspaceAuthError && error.code === "auth_required",
  );
});

test("requires one well-formed bearer token", () => {
  assert.equal(bearerToken("Bearer token-value"), "token-value");
  for (const value of [undefined, "", "Basic abc", "Bearer", "Bearer one two"]) {
    assertAuthError(() => bearerToken(value), "auth_required", 401);
  }
});
