import brandMark from "../assets/brand/8090-mark-dark.png";
import footerArt from "../assets/brand/letterhead-footer.webp";
import { useWorkspaceAuth } from "../contexts/WorkspaceAuthContext";
import { GoogleSignInButton } from "./GoogleSignInButton";


export function AccessGate() {
  const { status, accessError, gisReady } = useWorkspaceAuth();
  const denied = status === "denied";
  const failed = status === "error";
  const waiting = status === "loading" || status === "verifying";

  return (
    <div className="access-page">
      <a className="skip-link" href="#access-main">Skip to content</a>
      <header className="site-header access-header">
        <div className="brand" aria-label="EvalGPT">
          <img className="brand-mark" src={brandMark} alt="" />
          <span>EvalGPT</span>
        </div>
      </header>

      <main id="access-main" className="access-main">
        <section className="access-gate" aria-labelledby="access-title">
          <p className="eyebrow">PRD Judge · 8090 internal</p>
          <h1 id="access-title">
            {denied
              ? "This account does not have access."
              : failed
                ? "Sign-in is temporarily unavailable."
                : "Know if your PRD is ready to build."}
          </h1>
          {denied ? (
            <p className="access-lede">
              EvalGPT is available only to verified @8090.inc Google Workspace accounts.
              Sign out of Google, then choose your 8090 work account.
            </p>
          ) : failed ? (
            <p className="access-lede">
              {accessError || "EvalGPT could not verify Google Workspace access. Try again shortly."}
            </p>
          ) : (
            <p className="access-lede">
              EvalGPT gives you a readiness verdict, a deterministic score, and an
              evidence-backed path to GO. It is available to 8090 staff only.
            </p>
          )}

          <div className="access-action">
            {waiting ? (
              <p className="access-status" role="status">
                {status === "verifying"
                  ? "Verifying 8090 Workspace access…"
                  : "Preparing secure sign-in…"}
              </p>
            ) : (
              <>
                <p>Sign in with your @8090.inc Google Workspace account to continue.</p>
                {gisReady ? <GoogleSignInButton /> : (
                  <p className="access-status" role="status">Google sign-in is loading…</p>
                )}
              </>
            )}
          </div>

          <p className="access-privacy">
            Your sign-in stays in this browser tab&apos;s memory only. EvalGPT stores your
            evaluation-start count and nothing else about you or your documents.
          </p>
        </section>
      </main>

      <img className="footer-art" src={footerArt} alt="" />
      <footer className="site-footer access-footer">
        <div className="brand">
          <img className="brand-mark" src={brandMark} alt="" />
          <span>EvalGPT</span>
        </div>
        <p>Evidence-backed PRD judgment for 8090.</p>
      </footer>
    </div>
  );
}
