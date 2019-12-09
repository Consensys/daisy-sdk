module.exports = {
  verbose: true,
  testEnvironment: "node",
  // TODO: for now skip babel
  transformIgnorePatterns: ["/node_modules/", ".*"],
  testPathIgnorePatterns: ["<rootDir>/__tests__/utils.js"],
};
