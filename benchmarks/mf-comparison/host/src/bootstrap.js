import { createRoot } from "react-dom/client";
import { createElement } from "react";

// Load the federated remote component (the MF analog of loadRemote / <RemoteComponent>).
const Counter = (await import("widgets/Counter")).default;
createRoot(document.getElementById("root")).render(createElement(Counter, { label: "from MF remote" }));
