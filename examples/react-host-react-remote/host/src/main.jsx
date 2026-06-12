import React from "react";
import { createRoot } from "react-dom/client";
import { RemoteComponent } from "@fedkit/react";

// registerRemotes already ran in index.html's bootstrap (before this module imported),
// so the "widgets" remote is registered and loadRemote can resolve "widgets/Counter".

function App() {
  return React.createElement(
    "div",
    { style: { fontFamily: "system-ui", padding: 24, maxWidth: 720, margin: "0 auto" } },
    React.createElement("h1", null, "fedkit demo"),
    React.createElement(
      "p",
      { style: { color: "#555" } },
      "React host renders a React remote via ",
      React.createElement("code", null, "<RemoteComponent>"),
      ". One shared React via the import map — the remote's hooks work across the boundary.",
    ),
    React.createElement(RemoteComponent, {
      name: "widgets/Counter",
      label: "loaded from the remote, sharing the host's React",
      fallback: React.createElement("p", { "data-testid": "fallback" }, "loading remote…"),
      errorFallback: (e) =>
        React.createElement("p", { "data-testid": "error", style: { color: "crimson" } }, `error: ${e.message}`),
    }),
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
