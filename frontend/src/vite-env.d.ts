/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PUBLIC_EVALUATIONS_ENABLED?: string;
  readonly VITE_WORKSPACE_AUTH_REQUIRED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
