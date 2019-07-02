module.exports = {
  extends: [
    "@daisypayments/eslint-config",
    "@daisypayments/eslint-config/jest",
  ],
  rules: {
    "class-methods-use-this": "off",
    "no-use-before-define": ["error", { classes: false, functions: false }],
    "promise/prefer-await-to-then": "off",
  },
};
