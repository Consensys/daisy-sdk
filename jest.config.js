module.exports = {
  verbose: true,
  testEnvironment: "node",
  testTimeout: 10000, // 10 seg
  // TODO: for now skip babel
  transformIgnorePatterns: ["/node_modules/", ".*"],
  testPathIgnorePatterns: ["<rootDir>/__tests__/utils.js"],
};
