import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryQuotaStore,
  pseudonymousUserId,
  QuotaError,
} from "./quota.js";


function isQuota(code: QuotaError["code"]) {
  return (error: unknown) => error instanceof QuotaError && error.code === code;
}

test("enforces three starts per UTC day and resets at midnight UTC", async () => {
  const store = new InMemoryQuotaStore({ concurrent: 5 });
  const day = new Date("2026-07-24T23:59:00.000Z");
  for (let index = 0; index < 3; index += 1) {
    const reservation = await store.reserve("user-a", day);
    await store.release(reservation.leaseId, day);
  }
  await assert.rejects(store.reserve("user-a", day), isQuota("daily_limit_reached"));
  const nextDay = new Date("2026-07-25T00:00:00.000Z");
  const admitted = await store.reserve("user-a", nextDay);
  assert.equal(admitted.quota.daily.used, 1);
  assert.equal(admitted.quota.monthly.used, 4);
});

test("enforces ten starts per calendar month and resets on the first UTC day", async () => {
  const store = new InMemoryQuotaStore({ userDaily: 10, concurrent: 2 });
  for (let day = 1; day <= 10; day += 1) {
    const now = new Date(Date.UTC(2026, 6, day, 12));
    const reservation = await store.reserve("user-a", now);
    await store.release(reservation.leaseId, now);
  }
  await assert.rejects(
    store.reserve("user-a", new Date("2026-07-31T23:59:59.000Z")),
    isQuota("monthly_limit_reached"),
  );
  const nextMonth = new Date("2026-08-01T00:00:00.000Z");
  const admitted = await store.reserve("user-a", nextMonth);
  assert.equal(admitted.quota.monthly.used, 1);
});

test("enforces the organization-wide daily limit across users", async () => {
  const store = new InMemoryQuotaStore({
    userDaily: 10,
    userMonthly: 100,
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
    userDaily: 5,
    userMonthly: 20,
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
  assert.equal(next.quota.daily.used, 3, "the rejected capacity attempt must not consume quota");
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
  assert.equal(admitted.quota.daily.used, 1);
});

test("cancellation release frees concurrency but keeps the user's admitted count", async () => {
  const store = new InMemoryQuotaStore({ concurrent: 1 });
  const now = new Date("2026-07-24T12:00:00.000Z");
  const first = await store.reserve("user-a", now);
  await store.release(first.leaseId, now);
  const second = await store.reserve("user-a", now);
  assert.equal(second.quota.daily.used, 2);
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
