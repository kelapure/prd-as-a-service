export type AccessFailureCode =
  | "auth_required"
  | "token_expired"
  | "workspace_not_allowed"
  | "evaluation_limit_reached"
  | "global_limit_reached"
  | "capacity_busy"
  | "quota_store_unavailable"
  | "evaluations_disabled";

export interface AccessQuota {
  policy: "limited" | "unlimited";
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: null;
}

export interface AccessResponse {
  access: "allowed";
  identity: {
    email: string;
    tier: "internal" | "external";
  };
  quota: AccessQuota;
}

export interface AccessFailure {
  code?: AccessFailureCode | string;
  error?: string;
  retryable?: boolean;
  quota?: AccessQuota;
}
