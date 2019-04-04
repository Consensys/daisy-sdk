module.exports = {
  extends: ["@tokenfoundry/eslint-config", "@tokenfoundry/eslint-config/jest"],
  rules: {
    "class-methods-use-this": "off",
    "no-use-before-define": ["error", { classes: false, functions: false }],
  },
};
