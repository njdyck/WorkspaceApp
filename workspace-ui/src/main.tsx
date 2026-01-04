import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initWebTabListeners } from "./stores";
import { clearAllWorkspaceData } from "./services/persistence";

// Initialize Web Tab event listeners
initWebTabListeners();

// Alle Boards löschen für sauberen Test-Start
// TODO: Entfernen nach Testing
if (localStorage.getItem('workspace_boards')) {
  clearAllWorkspaceData();
  console.log('All boards cleared for testing');
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
