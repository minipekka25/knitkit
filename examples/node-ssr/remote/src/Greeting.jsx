// The exposed module (./Greeting) — a React component rendered on the SERVER.
//
// `react` is a bare specifier the loader hooks resolve to the SAME React that the SSR
// server's react-dom/server uses. useState here proves hooks work server-side with a
// single shared React (no dual-React), driven by the same manifest as the browser.
import React, { useState } from "react";

export default function Greeting({ name = "there" }) {
  const [message] = useState(`Hello, ${name}`);
  return React.createElement(
    "strong",
    { "data-testid": "greeting", style: { color: "#0ea5e9" } },
    `${message}! (federated component, rendered on the server)`,
  );
}
