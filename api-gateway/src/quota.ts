import { createHmac, randomUUID } from "node:crypto";

import { Firestore } from "@google-cloud/firestore";


export type QuotaFailureCode =
  | "evaluation_limit_reached"
  | "global_limit_reached"
  | "capacity_busy"
  | "quota_store_unavailable";

export type QuotaPolicy = "limited" | "unlimited";

export interface QuotaSnapshot {
  policy: QuotaPolicy;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: null;
}

export interface QuotaReservation {
  leaseId: string;
  quota: QuotaSnapshot;
}

export interface QuotaLimits {
  externalTotal: number;
  globalDaily: number;
  concurrent: number;
  leaseMs: number;
  ttlMs: number;
}

export interface QuotaStore {
  snapshot(subject: string, now?: Date, policy?: QuotaPolicy): Promise<QuotaSnapshot>;
  reserve(subject: string, now?: Date, policy?: QuotaPolicy): Promise<QuotaReservation>;
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
  totalCount: number;
}

interface GlobalQuotaRecord {
  dayKey: string;
  dayCount: number;
  leases: Record<string, number>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMITS: QuotaLimits = {
  externalTotal: 3,
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
    externalTotal: finitePositiveInteger(
      Number(process.env.EXTERNAL_TOTAL_RUN_LIMIT || 3),
      "EXTERNAL_TOTAL_RUN_LIMIT",
    ),
    globalDaily: finitePositiveInteger(Number(process.env.GLOBAL_DAILY_RUN_LIMIT || 50), "GLOBAL_DAILY_RUN_LIMIT"),
    concurrent: finitePositiveInteger(Number(process.env.GLOBAL_CONCURRENT_RUN_LIMIT || 2), "GLOBAL_CONCURRENT_RUN_LIMIT"),
    leaseMs: finitePositiveInteger(Number(process.env.QUOTA_LEASE_MS || 12 * 60 * 1000), "QUOTA_LEASE_MS"),
    ttlMs: finitePositiveInteger(Number(process.env.QUOTA_TTL_MS || 90 * DAY_MS), "QUOTA_TTL_MS"),
  };
}

function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function nextUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function retryAfter(now: Date, reset: Date): number {
  return Math.max(1, Math.ceil((reset.getTime() - now.getTime()) / 1000));
}

function normalizedUser(
  record: (Partial<UserQuotaRecord> & {
    dayCount?: number;
    monthCount?: number;
  }) | undefined,
): UserQuotaRecord {
  return {
    totalCount: Math.max(
      0,
      Number(record?.totalCount)
      || Number(record?.monthCount)
      || Number(record?.dayCount)
      || 0,
    ),
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

function quotaSnapshot(
  user: UserQuotaRecord,
  limits: QuotaLimits,
  policy: QuotaPolicy,
): QuotaSnapshot {
  if (policy === "unlimited") {
    return {
      policy,
      limit: null,
      used: 0,
      remaining: null,
      resetsAt: null,
    };
  }
  return {
    policy,
    limit: limits.externalTotal,
    used: user.totalCount,
    remaining: Math.max(0, limits.externalTotal - user.totalCount),
    resetsAt: null,
  };
}

function checkReservation(
  user: UserQuotaRecord,
  global: GlobalQuotaRecord,
  limits: QuotaLimits,
  now: Date,
  policy: QuotaPolicy,
): void {
  const snapshot = quotaSnapshot(user, limits, policy);
  if (policy === "limited" && user.totalCount >= limits.externalTotal) {
    throw new QuotaError(
      "evaluation_limit_reached",
      "You have used all three guest evaluations.",
      { quota: snapshot },
    );
  }
  if (policy === "limited" && global.dayCount >= limits.globalDaily) {
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
  policy: QuotaPolicy,
): { user: UserQuotaRecord; global: GlobalQuotaRecord } {
  return {
    user: {
      ...user,
      totalCount: user.totalCount + (policy === "limited" ? 1 : 0),
    },
    global: {
      ...global,
      dayCount: global.dayCount + (policy === "limited" ? 1 : 0),
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

  async snapshot(
    subject: string,
    _now: Date = new Date(),
    policy: QuotaPolicy = "limited",
  ): Promise<QuotaSnapshot> {
    try {
      if (policy === "unlimited") {
        await this.firestore.collection("evalgpt_quota").doc("global").get();
        return quotaSnapshot({ totalCount: 0 }, this.limits, policy);
      }
      const document = await this.firestore.collection("evalgpt_quota_users").doc(this.userId(subject)).get();
      const user = normalizedUser(document.exists ? document.data() : undefined);
      return quotaSnapshot(user, this.limits, policy);
    } catch (error) {
      throw storeUnavailable(error);
    }
  }

  async reserve(
    subject: string,
    now: Date = new Date(),
    policy: QuotaPolicy = "limited",
  ): Promise<QuotaReservation> {
    const leaseId = randomUUID();
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const globalRef = this.firestore.collection("evalgpt_quota").doc("global");
        const userRef = policy === "limited"
          ? this.firestore.collection("evalgpt_quota_users").doc(this.userId(subject))
          : null;
        const [globalDocument, userDocument] = userRef
          ? await transaction.getAll(globalRef, userRef)
          : [await transaction.get(globalRef), null];
        const user = normalizedUser(
          userDocument?.exists ? userDocument.data() : undefined,
        );
        const global = normalizedGlobal(globalDocument.exists ? globalDocument.data() : undefined, now);
        checkReservation(user, global, this.limits, now, policy);
        const admitted = admittedRecords(
          user,
          global,
          leaseId,
          this.limits,
          now,
          policy,
        );
        const expiresAt = new Date(now.getTime() + this.limits.ttlMs);
        if (userRef) {
          // The pseudonymous counter enforces a one-time allowance and therefore
          // intentionally has no TTL or timestamp. It contains no email, token,
          // activity history, or PRD data.
          transaction.set(userRef, {
            totalCount: admitted.user.totalCount,
          });
        }
        transaction.set(globalRef, {
          ...admitted.global,
          updatedAt: now,
          expiresAt,
        });
        return {
          leaseId,
          quota: quotaSnapshot(admitted.user, this.limits, policy),
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

  async snapshot(
    subject: string,
    _now: Date = new Date(),
    policy: QuotaPolicy = "limited",
  ): Promise<QuotaSnapshot> {
    return this.exclusive(() => quotaSnapshot(
      normalizedUser(this.users.get(subject)),
      this.limits,
      policy,
    ));
  }

  async reserve(
    subject: string,
    now: Date = new Date(),
    policy: QuotaPolicy = "limited",
  ): Promise<QuotaReservation> {
    return this.exclusive(() => {
      const user = normalizedUser(this.users.get(subject));
      const global = normalizedGlobal(this.global, now);
      checkReservation(user, global, this.limits, now, policy);
      const leaseId = randomUUID();
      const admitted = admittedRecords(
        user,
        global,
        leaseId,
        this.limits,
        now,
        policy,
      );
      if (policy === "limited") this.users.set(subject, admitted.user);
      this.global = admitted.global;
      return {
        leaseId,
        quota: quotaSnapshot(admitted.user, this.limits, policy),
      };
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
