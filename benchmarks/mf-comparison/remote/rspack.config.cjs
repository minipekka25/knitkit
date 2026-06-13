const path = require("node:path");
const { ModuleFederationPlugin } = require("@module-federation/enhanced/rspack");

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
  output: { path: path.join(__dirname, "dist"), publicPath: "auto", uniqueName: "widgets", clean: true },
  resolve: { extensions: [".js", ".jsx"] },
  module: { rules: [{ test: /\.jsx?$/, use: swc }] },
  plugins: [
    new ModuleFederationPlugin({
      name: "widgets",
      filename: "remoteEntry.js",
      exposes: { "./Counter": "./src/Counter.jsx" },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
      },
    }),
  ],
};
