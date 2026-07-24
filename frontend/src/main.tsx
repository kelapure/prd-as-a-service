import { createRoot } from "react-dom/client";

import App from "./App";
import { WorkspaceAuthProvider } from "./contexts/WorkspaceAuthContext";
import "./styles/fonts.css";
import "./styles/8090-tokens.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <WorkspaceAuthProvider>
    <App />
  </WorkspaceAuthProvider>,
);
