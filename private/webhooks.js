/* eslint lodash/prefer-lodash-typecheck:0 */

const crypto = require("crypto");

function isObject(something) {
  return typeof something === "object";
}

function sort(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      if (Array.isArray(obj[key])) {
        acc[key] = obj[key].map(sort);
      } else if (isObject(obj[key])) {
        acc[key] = sort(obj[key]);
      } else {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
}

exports.verify = function verify({
  message,
  digest,
  publicKey,
  algorithm,
} = {}) {
  const deterministic = isObject(message)
    ? JSON.stringify(sort(message))
    : message;

  const verifier = crypto.createVerify(algorithm || "RSA-SHA256");
  verifier.update(deterministic);
  verifier.end();

  return verifier.verify(publicKey, digest, "base64");
};
