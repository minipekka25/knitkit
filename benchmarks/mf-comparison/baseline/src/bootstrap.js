import { createRoot } from "react-dom/client";
import { createElement } from "react";
import Counter from "./Counter.jsx";

// Same app as the federated host, but Counter is imported directly (no federation).
createRoot(document.getElementById("root")).render(createElement(Counter, { label: "local" }));
