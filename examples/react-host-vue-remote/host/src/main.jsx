import React from "react";
import { createRoot } from "react-dom/client";
import { loadRemote } from "@knitkit/runtime";
// `shared-state` is a BARE specifier resolved via the import map — the same one
// the Vue remote imports. One import-map entry → one module instance → one object
// shared across the React host and the Vue remote. This is the singleton proof.
import { sharedState } from "shared-state";

sharedState.mark("host");

function App() {
  const slotRef = React.useRef(null);
  const [status, setStatus] = React.useState("loading…");
  const [touched, setTouched] = React.useState(() => Array.from(sharedState.touched));

  React.useEffect(() => {
    let unmount;
    (async () => {
      try {
        // The remote exposes a framework-agnostic mount(el) function. The React
        // host doesn't know or care that the widget is built with Vue.
        const mount = await loadRemote("checkout/CartWidget");
        if (!slotRef.current) return;
        unmount = mount(slotRef.current);
        setStatus("loaded");
        // The Vue remote marked sharedState during mount; re-read to render the proof.
        setTouched(Array.from(sharedState.touched));
      } catch (e) {
        setStatus(`error: ${e.message}`);
      }
    })();
    return () => { if (typeof unmount === "function") unmount(); };
  }, []);

  return React.createElement(
    "div",
    { style: { fontFamily: "system-ui", padding: 24, maxWidth: 720, margin: "0 auto" } },
    React.createElement("h1", null, "knitkit demo"),
    React.createElement(
      "p",
      { style: { color: "#555" } },
      "React host + Vue remote. ONE shared react/react-dom via import map."
    ),
    status !== "loaded"
      ? React.createElement("p", { "data-testid": "status" }, status)
      : null,
    React.createElement("div", { id: "remote-slot", ref: slotRef }),
    React.createElement(
      "details",
      { style: { marginTop: 32 }, open: true },
      React.createElement("summary", null, "Singleton proof"),
      React.createElement(
        "pre",
        { id: "singleton-proof", "data-testid": "singleton-proof", style: { background: "#f5f5f5", padding: 12, borderRadius: 6 } },
        "touched by: ",
        touched.join(", ") || "(none yet)"
      )
    )
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
