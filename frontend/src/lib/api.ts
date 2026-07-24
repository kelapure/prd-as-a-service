const localHostnames = new Set(["localhost", "127.0.0.1"]);

export const API_BASE = import.meta.env.VITE_API_BASE
  || (localHostnames.has(window.location.hostname) ? "http://127.0.0.1:8080" : "");

export const WORKSPACE_AUTH_REQUIRED = import.meta.env.VITE_WORKSPACE_AUTH_REQUIRED !== "false";
