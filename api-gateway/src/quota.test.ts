import assert from "node:assert/strict";
import test from "node:test";

import type { Firestore } from "@google-cloud/firestore";

import {
  FirestoreQuotaStore,
  InMemoryQuotaStore,
  pseudonymousUserId,
  QuotaError,
} from "./quota.js";


function isQuota(code: QuotaError["code"]) {
  return (error: unknown) => error instanceof QuotaError && error.code === code;
}

interface FakeDocumentReference {
  path: string;
}

interface FakeDocumentSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

function fakeFirestore() {
  const documents = new Map<string, Record<string, unknown>>();
  const reference = (path: string): FakeDocumentReference => ({ path });
  const snapshot = (ref: FakeDocumentReference): FakeDocumentSnapshot => ({
    exists: documents.has(ref.path),
    data: () => documents.get(ref.path),
  });
  const transaction = {
    async get(ref: FakeDocumentReference) {
      return snapshot(ref);
    },
    async getAll(...refs: FakeDocumentReference[]) {
      return refs.map(snapshot);
    },
    set(ref: FakeDocumentReference, value: Record<string, unknown>) {
      documents.set(ref.path, structuredClone(value));
    },
  };
  return {
    documents,
    client: {
      collection(name: string) {
        return {
          doc(id: string) {
            const ref = reference(`${name}/${id}`);
            return {
              ...ref,
              async get() {
                return snapshot(ref);
              },
            };
          },
        };
      },
      async runTransaction<T>(
        operation: (active: typeof transaction) => Promise<T>,
      ): Promise<T> {
        return operation(transaction);
      },
    } as unknown as Firestore,
  };
}

test("external accounts receive three evaluation starts total with no reset", async () => {
  const store = new InMemoryQuotaStore({
    externalTotal: 3,
    globalDaily: 50,
    concurrent: 2,
  });
  for (const now of [
    new Date("2026-07-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2027-07-24T12:00:00.000Z"),
  ]) {
    const reservation = await store.reserve("guest-a", now, "limited");
    await store.release(reservation.leaseId, now);
  }
  await assert.rejects(
    store.reserve("guest-a", new Date("2028-07-24T12:00:00.000Z"), "limited"),
    isQuota("evaluation_limit_reached"),
  );
  assert.deepEqual(
    await store.snapshot(
      "guest-a",
      new Date("2028-07-24T12:00:00.000Z"),
      "limited",
    ),
    {
      policy: "limited",
      limit: 3,
      used: 3,
      remaining: 0,
      resetsAt: null,
    },
  );
});

test("Firestore keeps only a durable pseudonymous guest total and no internal user record", async () => {
  const fake = fakeFirestore();
  const hmacKey = "0123456789abcdef0123456789abcdef";
  const store = new FirestoreQuotaStore({
    firestore: fake.client,
    hmacKey,
    limits: {
      externalTotal: 3,
      globalDaily: 50,
      concurrent: 2,
      leaseMs: 12 * 60 * 1000,
      ttlMs: 90 * 24 * 60 * 60 * 1000,
    },
  });
  const firstAt = new Date("2026-07-24T12:00:00.000Z");
  const secondAt = new Date("2027-07-24T12:00:00.000Z");
  const first = await store.reserve("external-google-subject", firstAt, "limited");
  await store.release(first.leaseId, firstAt);
  const second = await store.reserve("external-google-subject", secondAt, "limited");
  await store.release(second.leaseId, secondAt);

  const guestPath = `evalgpt_quota_users/${pseudonymousUserId(
    "external-google-subject",
    hmacKey,
  )}`;
  const guestRecord = fake.documents.get(guestPath);
  assert.ok(guestRecord);
  assert.equal(guestRecord.totalCount, 2);
  assert.equal(guestRecord.expiresAt, undefined);
  assert.equal(guestRecord.updatedAt, undefined);
  assert.equal(guestRecord.email, undefined);
  assert.equal(guestRecord.sub, undefined);
  assert.equal(guestRecord.subject, undefined);

  const internal = await store.reserve("internal-google-subject", secondAt, "unlimited");
  assert.equal(internal.quota.policy, "unlimited");
  assert.equal(
    fake.documents.has(
      `evalgpt_quota_users/${pseudonymousUserId("internal-google-subject", hmacKey)}`,
    ),
    false,
  );
  await store.release(internal.leaseId, secondAt);
});

test("internal accounts bypass user and global count limits but still reserve capacity", async () => {
  const store = new InMemoryQuotaStore({
    externalTotal: 1,
    globalDaily: 1,
    concurrent: 1,
  });
  const now = new Date("2026-07-24T12:00:00.000Z");
  for (let index = 0; index < 5; index += 1) {
    const reservation = await store.reserve("member-a", now, "unlimited");
    assert.deepEqual(reservation.quota, {
      policy: "unlimited",
      limit: null,
      used: 0,
      remaining: null,
      resetsAt: null,
    });
    await store.release(reservation.leaseId, now);
  }
  const active = await store.reserve("member-a", now, "unlimited");
  await assert.rejects(
    store.reserve("member-b", now, "unlimited"),
    isQuota("capacity_busy"),
  );
  await store.release(active.leaseId, now);

  const guest = await store.reserve("guest-a", now, "limited");
  await store.release(guest.leaseId, now);
  await assert.rejects(
    store.reserve("guest-b", now, "limited"),
    isQuota("global_limit_reached"),
  );
});

test("enforces the guest-wide daily safety limit across external users", async () => {
  const store = new InMemoryQuotaStore({
    externalTotal: 10,
    globalDaily: 2,
    concurrent: 2,
  });
  const now = new Date("2026-07-24T12:00:00.000Z");
  const first = await store.reserve("user-a", now);
  await store.release(first.leaseId, now);
  const second = await store.reserve("user-b", now);
  await store.release(second.leaseId, now);
  await assert.rejects(store.reserve("user-c", now), isQuota("global_limit_reached"));
});

test("admits only two simultaneous evaluations and does not count a capacity rejection", async () => {
  const store = new InMemoryQuotaStore({
    externalTotal: 5,
    globalDaily: 50,
    concurrent: 2,
  });
  const now = new Date("2026-07-24T12:00:00.000Z");
  const attempts = await Promise.allSettled([
    store.reserve("user-a", now),
    store.reserve("user-a", now),
    store.reserve("user-a", now),
  ]);
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 2);
  const rejected = attempts.find((attempt) => attempt.status === "rejected");
  assert.ok(rejected?.status === "rejected" && isQuota("capacity_busy")(rejected.reason));

  const first = attempts.find((attempt) => attempt.status === "fulfilled");
  assert.ok(first?.status === "fulfilled");
  await store.release(first.value.leaseId, now);
  const next = await store.reserve("user-a", now);
  assert.equal(next.quota.used, 3, "the rejected capacity attempt must not consume quota");
});

test("expired twelve-minute leases free capacity without refunding admitted starts", async () => {
  const store = new InMemoryQuotaStore({ concurrent: 1, leaseMs: 12 * 60 * 1000 });
  const started = new Date("2026-07-24T12:00:00.000Z");
  await store.reserve("user-a", started);
  await assert.rejects(
    store.reserve("user-b", new Date("2026-07-24T12:11:59.000Z")),
    isQuota("capacity_busy"),
  );
  const admitted = await store.reserve("user-b", new Date("2026-07-24T12:12:00.000Z"));
  assert.equal(admitted.quota.used, 1);
});

test("cancellation release frees concurrency but keeps the user's admitted count", async () => {
  const store = new InMemoryQuotaStore({ concurrent: 1 });
  const now = new Date("2026-07-24T12:00:00.000Z");
  const first = await store.reserve("user-a", now);
  await store.release(first.leaseId, now);
  const second = await store.reserve("user-a", now);
  assert.equal(second.quota.used, 2);
});

test("fails closed when the authoritative store is unavailable", async () => {
  const store = new InMemoryQuotaStore();
  store.setUnavailable(true);
  await assert.rejects(store.snapshot("user-a"), isQuota("quota_store_unavailable"));
  await assert.rejects(store.reserve("user-a"), isQuota("quota_store_unavailable"));
  await assert.rejects(store.health(), isQuota("quota_store_unavailable"));
});

test("pseudonymous user IDs are stable HMAC digests and do not contain the Google subject", () => {
  const subject = "google-subject-123";
  const key = "0123456789abcdef0123456789abcdef";
  const first = pseudonymousUserId(subject, key);
  const second = pseudonymousUserId(subject, key);
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.ok(!first.includes(subject));
  assert.notEqual(first, pseudonymousUserId(subject, `${key}different`));
});
