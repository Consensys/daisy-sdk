"use strict";

module.exports = {
  plugins: ["plugins/markdown"],
  readme: "README",
  sourceType: "module",

  source: {
    include: ["README.md", "browser", "common", "private"],
  },
  opts: {
    readme: "README.md",
    destination: "docs/",
    recurse: true,
  },
};
