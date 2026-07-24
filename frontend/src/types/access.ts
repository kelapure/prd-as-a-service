export type AccessFailureCode =
  | "auth_required"
  | "token_expired"
  | "workspace_not_allowed"
  | "daily_limit_reached"
  | "monthly_limit_reached"
  | "global_limit_reached"
  | "capacity_busy"
  | "quota_store_unavailable"
  | "evaluations_disabled";

export interface QuotaWindow {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export interface AccessQuota {
  daily: QuotaWindow;
  monthly: QuotaWindow;
}

export interface AccessResponse {
  access: "allowed";
  identity: {
    email: string;
  };
  quota: AccessQuota;
}

export interface AccessFailure {
  code?: AccessFailureCode | string;
  error?: string;
  retryable?: boolean;
  quota?: AccessQuota;
}
