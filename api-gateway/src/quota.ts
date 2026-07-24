import { createHmac, randomUUID } from "node:crypto";

import { Firestore } from "@google-cloud/firestore";


export type QuotaFailureCode =
  | "daily_limit_reached"
  | "monthly_limit_reached"
  | "global_limit_reached"
  | "capacity_busy"
  | "quota_store_unavailable";

export interface QuotaWindow {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export interface QuotaSnapshot {
  daily: QuotaWindow;
  monthly: QuotaWindow;
}

export interface QuotaReservation {
  leaseId: string;
  quota: QuotaSnapshot;
}

export interface QuotaLimits {
  userDaily: number;
  userMonthly: number;
  globalDaily: number;
  concurrent: number;
  leaseMs: number;
  ttlMs: number;
}

export interface QuotaStore {
  snapshot(subject: string, now?: Date): Promise<QuotaSnapshot>;
  reserve(subject: string, now?: Date): Promise<QuotaReservation>;
  release(leaseId: string, now?: Date): Promise<void>;
  health(): Promise<void>;
}

export class QuotaError extends Error {
  readonly code: QuotaFailureCode;
  readonly statusCode: 429 | 503;
  readonly retryAfterSeconds?: number;
  readonly quota?: QuotaSnapshot;

  constructor(
    code: QuotaFailureCode,
    message: string,
    options: {
      retryAfterSeconds?: number;
      quota?: QuotaSnapshot;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "QuotaError";
    this.code = code;
    this.statusCode = code === "quota_store_unavailable" ? 503 : 429;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.quota = options.quota;
  }
}

interface UserQuotaRecord {
  dayKey: string;
  dayCount: number;
  monthKey: string;
  monthCount: number;
}

interface GlobalQuotaRecord {
  dayKey: string;
  dayCount: number;
  leases: Record<string, number>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMITS: QuotaLimits = {
  userDaily: 3,
  userMonthly: 10,
  globalDaily: 50,
  concurrent: 2,
  leaseMs: 12 * 60 * 1000,
  ttlMs: 90 * DAY_MS,
};

function finitePositiveInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function quotaLimitsFromEnv(): QuotaLimits {
  return {
    userDaily: finitePositiveInteger(Number(process.env.USER_DAILY_RUN_LIMIT || 3), "USER_DAILY_RUN_LIMIT"),
    userMonthly: finitePositiveInteger(Number(process.env.USER_MONTHLY_RUN_LIMIT || 10), "USER_MONTHLY_RUN_LIMIT"),
    globalDaily: finitePositiveInteger(Number(process.env.GLOBAL_DAILY_RUN_LIMIT || 50), "GLOBAL_DAILY_RUN_LIMIT"),
    concurrent: finitePositiveInteger(Number(process.env.GLOBAL_CONCURRENT_RUN_LIMIT || 2), "GLOBAL_CONCURRENT_RUN_LIMIT"),
    leaseMs: finitePositiveInteger(Number(process.env.QUOTA_LEASE_MS || 12 * 60 * 1000), "QUOTA_LEASE_MS"),
    ttlMs: finitePositiveInteger(Number(process.env.QUOTA_TTL_MS || 90 * DAY_MS), "QUOTA_TTL_MS"),
  };
}

function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function utcMonthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

function nextUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function nextUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function retryAfter(now: Date, reset: Date): number {
  return Math.max(1, Math.ceil((reset.getTime() - now.getTime()) / 1000));
}

function normalizedUser(record: Partial<UserQuotaRecord> | undefined, now: Date): UserQuotaRecord {
  const dayKey = utcDayKey(now);
  const monthKey = utcMonthKey(now);
  return {
    dayKey,
    dayCount: record?.dayKey === dayKey ? Math.max(0, Number(record.dayCount) || 0) : 0,
    monthKey,
    monthCount: record?.monthKey === monthKey ? Math.max(0, Number(record.monthCount) || 0) : 0,
  };
}

function normalizedGlobal(
  record: Partial<GlobalQuotaRecord> | undefined,
  now: Date,
): GlobalQuotaRecord {
  const dayKey = utcDayKey(now);
  const nowMs = now.getTime();
  const leases = Object.fromEntries(
    Object.entries(record?.leases || {}).filter(([, expiresAt]) => Number(expiresAt) > nowMs),
  );
  return {
    dayKey,
    dayCount: record?.dayKey === dayKey ? Math.max(0, Number(record.dayCount) || 0) : 0,
    leases,
  };
}

function quotaSnapshot(user: UserQuotaRecord, limits: QuotaLimits, now: Date): QuotaSnapshot {
  return {
    daily: {
      limit: limits.userDaily,
      used: user.dayCount,
      remaining: Math.max(0, limits.userDaily - user.dayCount),
      resetsAt: nextUtcDay(now).toISOString(),
    },
    monthly: {
      limit: limits.userMonthly,
      used: user.monthCount,
      remaining: Math.max(0, limits.userMonthly - user.monthCount),
      resetsAt: nextUtcMonth(now).toISOString(),
    },
  };
}

function checkReservation(
  user: UserQuotaRecord,
  global: GlobalQuotaRecord,
  limits: QuotaLimits,
  now: Date,
): void {
  const snapshot = quotaSnapshot(user, limits, now);
  if (user.dayCount >= limits.userDaily) {
    throw new QuotaError(
      "daily_limit_reached",
      "You have used all three evaluations available today.",
      { quota: snapshot, retryAfterSeconds: retryAfter(now, nextUtcDay(now)) },
    );
  }
  if (user.monthCount >= limits.userMonthly) {
    throw new QuotaError(
      "monthly_limit_reached",
      "You have used all ten evaluations available this month.",
      { quota: snapshot, retryAfterSeconds: retryAfter(now, nextUtcMonth(now)) },
    );
  }
  if (global.dayCount >= limits.globalDaily) {
    throw new QuotaError(
      "global_limit_reached",
      "EvalGPT has reached today's organization-wide evaluation limit.",
      { quota: snapshot, retryAfterSeconds: retryAfter(now, nextUtcDay(now)) },
    );
  }
  if (Object.keys(global.leases).length >= limits.concurrent) {
    const earliestExpiry = Math.min(...Object.values(global.leases));
    throw new QuotaError(
      "capacity_busy",
      "Both evaluation slots are in use. Try again shortly.",
      {
        quota: snapshot,
        retryAfterSeconds: Math.max(1, Math.ceil((earliestExpiry - now.getTime()) / 1000)),
      },
    );
  }
}

function admittedRecords(
  user: UserQuotaRecord,
  global: GlobalQuotaRecord,
  leaseId: string,
  limits: QuotaLimits,
  now: Date,
): { user: UserQuotaRecord; global: GlobalQuotaRecord } {
  return {
    user: {
      ...user,
      dayCount: user.dayCount + 1,
      monthCount: user.monthCount + 1,
    },
    global: {
      ...global,
      dayCount: global.dayCount + 1,
      leases: {
        ...global.leases,
        [leaseId]: now.getTime() + limits.leaseMs,
      },
    },
  };
}

function storeUnavailable(error: unknown): QuotaError {
  if (error instanceof QuotaError) return error;
  return new QuotaError(
    "quota_store_unavailable",
    "Evaluation access is temporarily unavailable because quota enforcement could not be verified.",
    { retryAfterSeconds: 60, cause: error },
  );
}

export function pseudonymousUserId(subject: string, hmacKey: string): string {
  return createHmac("sha256", hmacKey).update(subject, "utf8").digest("hex");
}

export class FirestoreQuotaStore implements QuotaStore {
  private readonly firestore: Firestore;
  private readonly hmacKey: string;
  private readonly limits: QuotaLimits;

  constructor(options: {
    firestore?: Firestore;
    hmacKey: string;
    limits?: QuotaLimits;
  }) {
    if (Buffer.byteLength(options.hmacKey, "utf8") < 32) {
      throw new Error("QUOTA_IDENTITY_HMAC_KEY must contain at least 32 bytes");
    }
    this.firestore = options.firestore || new Firestore();
    this.hmacKey = options.hmacKey;
    this.limits = options.limits || DEFAULT_LIMITS;
  }

  private userId(subject: string): string {
    return pseudonymousUserId(subject, this.hmacKey);
  }

  async snapshot(subject: string, now: Date = new Date()): Promise<QuotaSnapshot> {
    try {
      const document = await this.firestore.collection("evalgpt_quota_users").doc(this.userId(subject)).get();
      const user = normalizedUser(document.exists ? document.data() : undefined, now);
      return quotaSnapshot(user, this.limits, now);
    } catch (error) {
      throw storeUnavailable(error);
    }
  }

  async reserve(subject: string, now: Date = new Date()): Promise<QuotaReservation> {
    const leaseId = randomUUID();
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const globalRef = this.firestore.collection("evalgpt_quota").doc("global");
        const userRef = this.firestore.collection("evalgpt_quota_users").doc(this.userId(subject));
        const [globalDocument, userDocument] = await transaction.getAll(globalRef, userRef);
        const user = normalizedUser(userDocument.exists ? userDocument.data() : undefined, now);
        const global = normalizedGlobal(globalDocument.exists ? globalDocument.data() : undefined, now);
        checkReservation(user, global, this.limits, now);
        const admitted = admittedRecords(user, global, leaseId, this.limits, now);
        const expiresAt = new Date(now.getTime() + this.limits.ttlMs);
        transaction.set(userRef, {
          ...admitted.user,
          updatedAt: now,
          expiresAt,
        });
        transaction.set(globalRef, {
          ...admitted.global,
          updatedAt: now,
          expiresAt,
        });
        return {
          leaseId,
          quota: quotaSnapshot(admitted.user, this.limits, now),
        };
      }, { maxAttempts: 5 });
    } catch (error) {
      throw storeUnavailable(error);
    }
  }

  async release(leaseId: string, now: Date = new Date()): Promise<void> {
    try {
      await this.firestore.runTransaction(async (transaction) => {
        const globalRef = this.firestore.collection("evalgpt_quota").doc("global");
        const document = await transaction.get(globalRef);
        const global = normalizedGlobal(document.exists ? document.data() : undefined, now);
        if (!(leaseId in global.leases)) return;
        delete global.leases[leaseId];
        transaction.set(globalRef, {
          ...global,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + this.limits.ttlMs),
        });
      }, { maxAttempts: 5 });
    } catch (error) {
      throw storeUnavailable(error);
    }
  }

  async health(): Promise<void> {
    try {
      await this.firestore.collection("evalgpt_quota").doc("global").get();
    } catch (error) {
      throw storeUnavailable(error);
    }
  }
}

/**
 * Deterministic test double. Production construction never selects this store.
 */
export class InMemoryQuotaStore implements QuotaStore {
  private readonly users = new Map<string, UserQuotaRecord>();
  private global: GlobalQuotaRecord = { dayKey: "", dayCount: 0, leases: {} };
  private queue: Promise<void> = Promise.resolve();
  private unavailable = false;
  readonly limits: QuotaLimits;

  constructor(limits: Partial<QuotaLimits> = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  setUnavailable(unavailable: boolean): void {
    this.unavailable = unavailable;
  }

  private async exclusive<T>(operation: () => T | Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      if (this.unavailable) throw storeUnavailable(new Error("simulated outage"));
      return await operation();
    } finally {
      release();
    }
  }

  async snapshot(subject: string, now: Date = new Date()): Promise<QuotaSnapshot> {
    return this.exclusive(() => quotaSnapshot(normalizedUser(this.users.get(subject), now), this.limits, now));
  }

  async reserve(subject: string, now: Date = new Date()): Promise<QuotaReservation> {
    return this.exclusive(() => {
      const user = normalizedUser(this.users.get(subject), now);
      const global = normalizedGlobal(this.global, now);
      checkReservation(user, global, this.limits, now);
      const leaseId = randomUUID();
      const admitted = admittedRecords(user, global, leaseId, this.limits, now);
      this.users.set(subject, admitted.user);
      this.global = admitted.global;
      return { leaseId, quota: quotaSnapshot(admitted.user, this.limits, now) };
    });
  }

  async release(leaseId: string, now: Date = new Date()): Promise<void> {
    await this.exclusive(() => {
      this.global = normalizedGlobal(this.global, now);
      delete this.global.leases[leaseId];
    });
  }

  async health(): Promise<void> {
    await this.exclusive(() => undefined);
  }
}
