// The exposed module (./Counter) — a React component that uses a hook (useState).
//
// `react` is a BARE specifier the host's import map resolves to the SAME React instance
// the host uses. If React were NOT shared, rendering this remote component inside the
// host's React tree would throw "Invalid hook call… more than one copy of React". So a
// working counter here is the singleton proof.
import React, { useState } from "react";

export default function Counter({ label = "remote counter" }) {
  const [count, setCount] = useState(0);
  return React.createElement(
    "div",
    {
      "data-testid": "remote-counter",
      style: {
        border: "2px solid #6366f1",
        borderRadius: 8,
        padding: 16,
        background: "#eef2ff",
        fontFamily: "system-ui",
      },
    },
    React.createElement("h2", { style: { margin: 0, color: "#4f46e5" } }, "Counter (React remote)"),
    React.createElement("p", null, label),
    React.createElement("p", { "data-testid": "count" }, `count: ${count}`),
    React.createElement(
      "button",
      {
        "data-testid": "increment",
        onClick: () => setCount((c) => c + 1),
        style: { padding: "6px 12px", border: "1px solid #6366f1", background: "white", borderRadius: 4, cursor: "pointer" },
      },
      "+1",
    ),
  );
}
