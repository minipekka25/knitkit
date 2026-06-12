// This file is emitted by `fedkit build` alongside the shared-state.js
// from the host. Both apps import it as the bare specifier `shared-state`,
// which the import map resolves to the SAME URL. That's the federation
// singleton proof.
export const sharedState = {
  tag: "host-instance",
  touched: new Set(),
  mark(from) {
    this.touched.add(from);
  },
};
