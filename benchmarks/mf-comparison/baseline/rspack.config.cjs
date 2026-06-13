const path = require("node:path");

// Identical app + bundler to the MF host, but with NO ModuleFederationPlugin. The difference
// in total shipped JS between this and the federated host isolates the federation overhead,
// independent of how either build chunks React.
const swc = {
  loader: "builtin:swc-loader",
  options: {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
  },
};

module.exports = {
  mode: "production",
  entry: "./src/index.js",
  context: __dirname,
  output: { path: path.join(__dirname, "dist"), publicPath: "auto", uniqueName: "baseline", clean: true },
  resolve: { extensions: [".js", ".jsx"] },
  module: { rules: [{ test: /\.jsx?$/, use: swc }] },
};
