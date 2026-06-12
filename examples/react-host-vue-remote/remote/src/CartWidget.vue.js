// The exposed module (./CartWidget) — a Vue 3 widget published as a
// framework-agnostic mount(el) function. The React host calls mount(el) without
// knowing this is Vue at all. That's the federation contract: a remote exposes
// a tiny mount/unmount surface, not a framework-specific component.

import { createApp, h, ref, onMounted } from "vue";

// `shared-state` is a bare specifier the import map resolves to the SAME file
// the host imports. One module instance, shared across the framework boundary.
import { sharedState } from "shared-state";

/**
 * Mount the CartWidget into a host-provided DOM element.
 * @param {HTMLElement} el
 * @returns {() => void} unmount
 */
export default function mount(el) {
  const app = createApp({
    setup() {
      const count = ref(0);
      onMounted(() => {
        sharedState.mark("vue-remote");
      });
      return () =>
        h(
          "div",
          {
            style: {
              border: "2px solid #42b883",
              borderRadius: "8px",
              padding: "16px",
              background: "#f0fdf4",
              fontFamily: "system-ui",
            },
          },
          [
            h("h2", { style: { margin: 0, color: "#42b883" } }, "CartWidget (Vue 3 remote)"),
            h("p", null, [
              "touched by: ",
              h("strong", { "data-testid": "touched-by" }, Array.from(sharedState.touched).join(", ")),
            ]),
            h("p", { "data-testid": "count" }, `count: ${count.value}`),
            h(
              "button",
              {
                "data-testid": "increment",
                onClick: () => {
                  count.value++;
                },
                style: {
                  padding: "6px 12px",
                  border: "1px solid #42b883",
                  background: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                },
              },
              "+1"
            ),
          ]
        );
    },
  });
  app.mount(el);
  return () => app.unmount();
}
