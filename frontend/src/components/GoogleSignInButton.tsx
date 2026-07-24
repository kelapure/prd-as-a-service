import { useEffect, useRef } from "react";

import { useWorkspaceAuth } from "../contexts/WorkspaceAuthContext";


export function GoogleSignInButton() {
  const { gisReady, renderGoogleButton, status } = useWorkspaceAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gisReady && buttonRef.current && status !== "verifying") {
      renderGoogleButton(buttonRef.current);
    }
  }, [gisReady, renderGoogleButton, status]);

  return (
    <div
      className="google-sign-in"
      ref={buttonRef}
      aria-label="Sign in with Google"
      data-testid="google-sign-in"
    />
  );
}
