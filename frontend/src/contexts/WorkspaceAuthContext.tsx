import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { API_BASE, WORKSPACE_AUTH_REQUIRED } from "../lib/api";
import type { AccessFailure, AccessResponse } from "../types/access";


type AuthStatus =
  | "loading"
  | "signed_out"
  | "verifying"
  | "authorized"
  | "denied"
  | "expired"
  | "error";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select: boolean;
        cancel_on_tap_outside: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type: "standard";
          theme: "outline";
          size: "large";
          text: "signin_with";
          shape: "rectangular";
          width: number;
        },
      ): void;
      disableAutoSelect(): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

interface WorkspaceAuthValue {
  authRequired: boolean;
  status: AuthStatus;
  token: string | null;
  access: AccessResponse | null;
  accessError: string;
  everAuthorized: boolean;
  gisReady: boolean;
  renderGoogleButton: (element: HTMLElement) => void;
  refreshAccess: () => Promise<void>;
  markExpired: () => void;
  signOut: () => void;
}

class AccessRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AccessRequestError";
    this.status = status;
    this.code = code;
  }
}

const WorkspaceAuthContext = createContext<WorkspaceAuthValue | null>(null);
let gisLoadPromise: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-evalgpt-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in did not load.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.evalgptGis = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Google sign-in did not load.")), {
      once: true,
    });
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

async function requestAccess(token: string): Promise<AccessResponse> {
  const response = await fetch(`${API_BASE}/api/access`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as AccessFailure;
    throw new AccessRequestError(
      payload.error || "EvalGPT could not verify your access.",
      response.status,
      payload.code,
    );
  }
  return response.json() as Promise<AccessResponse>;
}

export function WorkspaceAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    WORKSPACE_AUTH_REQUIRED ? "loading" : "authorized",
  );
  const [token, setToken] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [accessError, setAccessError] = useState("");
  const [everAuthorized, setEverAuthorized] = useState(!WORKSPACE_AUTH_REQUIRED);
  const [gisReady, setGisReady] = useState(false);
  const mounted = useRef(true);

  const acceptCredential = useCallback(async (credential: string) => {
    setStatus("verifying");
    setAccessError("");
    try {
      const verified = await requestAccess(credential);
      if (!mounted.current) return;
      setToken(credential);
      setAccess(verified);
      setEverAuthorized(true);
      setStatus("authorized");
    } catch (error) {
      if (!mounted.current) return;
      setToken(null);
      const requestError = error instanceof AccessRequestError ? error : null;
      if (requestError?.code === "workspace_not_allowed" || requestError?.status === 403) {
        window.google?.accounts.id.disableAutoSelect();
        setStatus("denied");
      } else if (requestError?.code === "token_expired") {
        setStatus("expired");
      } else {
        setStatus("error");
      }
      setAccessError(error instanceof Error ? error.message : "EvalGPT could not verify your access.");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!WORKSPACE_AUTH_REQUIRED) return () => {
      mounted.current = false;
    };

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      setStatus("error");
      setAccessError("Google sign-in is not configured for this deployment.");
      return () => {
        mounted.current = false;
      };
    }
    void loadGoogleIdentityServices()
      .then(() => {
        if (!mounted.current || !window.google?.accounts.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) void acceptCredential(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        setGisReady(true);
        setStatus("signed_out");
      })
      .catch((error) => {
        if (!mounted.current) return;
        setStatus("error");
        setAccessError(error instanceof Error ? error.message : "Google sign-in did not load.");
      });

    return () => {
      mounted.current = false;
    };
  }, [acceptCredential]);

  const renderGoogleButton = useCallback((element: HTMLElement) => {
    if (!window.google?.accounts.id) return;
    element.replaceChildren();
    window.google.accounts.id.renderButton(element, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: Math.min(360, Math.max(240, element.clientWidth || 320)),
    });
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!WORKSPACE_AUTH_REQUIRED || !token) return;
    try {
      const verified = await requestAccess(token);
      if (!mounted.current) return;
      setAccess(verified);
      setAccessError("");
      setStatus("authorized");
    } catch (error) {
      if (!mounted.current) return;
      const requestError = error instanceof AccessRequestError ? error : null;
      if (requestError?.status === 401) {
        setToken(null);
        setStatus("expired");
      } else if (requestError?.status === 403) {
        setToken(null);
        setStatus("denied");
      } else {
        setAccessError(error instanceof Error ? error.message : "Quota status is unavailable.");
      }
    }
  }, [token]);

  const markExpired = useCallback(() => {
    setToken(null);
    setStatus("expired");
    setAccessError("");
    window.google?.accounts.id.disableAutoSelect();
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setAccess(null);
    setAccessError("");
    setEverAuthorized(false);
    setStatus("signed_out");
    window.google?.accounts.id.disableAutoSelect();
  }, []);

  const value = useMemo<WorkspaceAuthValue>(() => ({
    authRequired: WORKSPACE_AUTH_REQUIRED,
    status,
    token,
    access,
    accessError,
    everAuthorized,
    gisReady,
    renderGoogleButton,
    refreshAccess,
    markExpired,
    signOut,
  }), [
    access,
    accessError,
    everAuthorized,
    gisReady,
    markExpired,
    refreshAccess,
    renderGoogleButton,
    signOut,
    status,
    token,
  ]);

  return <WorkspaceAuthContext.Provider value={value}>{children}</WorkspaceAuthContext.Provider>;
}

export function useWorkspaceAuth(): WorkspaceAuthValue {
  const context = useContext(WorkspaceAuthContext);
  if (!context) throw new Error("useWorkspaceAuth must be used inside WorkspaceAuthProvider");
  return context;
}
