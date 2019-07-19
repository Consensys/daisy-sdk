const crypto = require("crypto");

exports.verify = function verify(
  { message, digest, publicKey, algorithm } = { algorithm: "sha256" }
) {
  const verifier = crypto.createVerify(algorithm);
  verifier.update(message);
  verifier.end();

  return verifier.verify(publicKey, digest);
};
