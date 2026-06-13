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
  output: { path: path.join(__dirname, "dist"), publicPath: "auto", uniqueName: "host", clean: true },
  resolve: { extensions: [".js", ".jsx"] },
  module: { rules: [{ test: /\.jsx?$/, use: swc }] },
  plugins: [
    new ModuleFederationPlugin({
      name: "host",
      remotes: { widgets: "widgets@http://localhost:5300/remoteEntry.js" },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
      },
    }),
  ],
};
