import { OAuth2Client, type LoginTicket, type TokenPayload } from "google-auth-library";


export const DEFAULT_WORKSPACE_DOMAIN = "8090.inc";

export type WorkspaceAuthCode =
  | "auth_required"
  | "token_expired"
  | "workspace_not_allowed";

export interface WorkspaceIdentity {
  sub: string;
  email: string;
  domain: string;
}

export interface WorkspaceTokenVerifier {
  verify(token: string): Promise<WorkspaceIdentity>;
}

interface GoogleIdTokenClient {
  verifyIdToken(options: { idToken: string; audience: string }): Promise<LoginTicket>;
}

export class WorkspaceAuthError extends Error {
  readonly code: WorkspaceAuthCode;
  readonly statusCode: 401 | 403;

  constructor(code: WorkspaceAuthCode, message: string, statusCode: 401 | 403) {
    super(message);
    this.name = "WorkspaceAuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function bearerToken(authorization: string | undefined): string {
  if (!authorization) {
    throw new WorkspaceAuthError(
      "auth_required",
      "Sign in with your work Google account to continue.",
      401,
    );
  }
  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  if (!match) {
    throw new WorkspaceAuthError(
      "auth_required",
      "A valid Google sign-in is required.",
      401,
    );
  }
  return match[1];
}

function audienceMatches(aud: TokenPayload["aud"], expected: string): boolean {
  return Array.isArray(aud) ? aud.includes(expected) : aud === expected;
}

export function validateWorkspaceClaims(
  payload: TokenPayload | undefined,
  audience: string,
  allowedDomain: string,
  now: Date = new Date(),
): WorkspaceIdentity {
  if (!payload) {
    throw new WorkspaceAuthError("auth_required", "The Google sign-in token is invalid.", 401);
  }
  if (payload.exp === undefined || payload.exp * 1000 <= now.getTime()) {
    throw new WorkspaceAuthError(
      "token_expired",
      "Your Google sign-in expired. Sign in again to continue.",
      401,
    );
  }
  if (
    !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss || "")
    || !audienceMatches(payload.aud, audience)
  ) {
    throw new WorkspaceAuthError("auth_required", "The Google sign-in token is invalid.", 401);
  }

  const email = payload.email?.trim().toLowerCase();
  const domain = payload.hd?.trim().toLowerCase();
  const expectedDomain = allowedDomain.trim().toLowerCase();
  if (
    payload.email_verified !== true
    || domain !== expectedDomain
    || !email
    || !email.endsWith(`@${expectedDomain}`)
    || email.slice(0, -expectedDomain.length - 1).length === 0
  ) {
    throw new WorkspaceAuthError(
      "workspace_not_allowed",
      "This account does not have access. Use your authorized work account.",
      403,
    );
  }
  if (!payload.sub?.trim()) {
    throw new WorkspaceAuthError("auth_required", "The Google sign-in token is invalid.", 401);
  }

  return { sub: payload.sub, email, domain };
}

export function createGoogleWorkspaceVerifier(
  audience: string,
  allowedDomain = DEFAULT_WORKSPACE_DOMAIN,
  client: GoogleIdTokenClient = new OAuth2Client(),
  now: () => Date = () => new Date(),
): WorkspaceTokenVerifier {
  if (!audience.trim()) throw new Error("GOOGLE_OAUTH_CLIENT_ID is required");
  if (!allowedDomain.trim()) throw new Error("GOOGLE_WORKSPACE_DOMAIN is required");

  return {
    async verify(token: string): Promise<WorkspaceIdentity> {
      try {
        const ticket = await client.verifyIdToken({ idToken: token, audience });
        return validateWorkspaceClaims(ticket.getPayload(), audience, allowedDomain, now());
      } catch (error) {
        if (error instanceof WorkspaceAuthError) throw error;
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (message.includes("expired") || message.includes("too late")) {
          throw new WorkspaceAuthError(
            "token_expired",
            "Your Google sign-in expired. Sign in again to continue.",
            401,
          );
        }
        throw new WorkspaceAuthError("auth_required", "The Google sign-in token is invalid.", 401);
      }
    },
  };
}
