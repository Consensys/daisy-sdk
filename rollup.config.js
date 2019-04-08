import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";

const pkg = require("./package.json");

export default {
  input: "browser/index.js",
  output: [
    {
      file: pkg["main"],
      format: "cjs",
      sourcemap: true,
    },
    {
      file: pkg["module"],
      format: "es",
      sourcemap: true,
    },
  ],
  plugins: [
    resolve(),
    commonjs({
      include: ["contracts/**", "node_modules/**"],
    }),
    babel({
      exclude: "node_modules/**",
      runtimeHelpers: true,
      // externalHelpers: true,
    }),
    json(),
  ],
  external: id => {
    const externals = ["web3"];
    return externals.includes(id);
  },
};
