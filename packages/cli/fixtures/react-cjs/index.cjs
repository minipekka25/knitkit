"use strict";
// Tiny stand-in for the React CJS surface used in the fixture.
// Real React is large; this exercises esbuild's CJS->ESM path.
const React = {
  version: "18.3.1",
  createElement: function (type, props) {
    return { type: type, props: props || null };
  },
};
module.exports = React;
module.exports.default = React;
