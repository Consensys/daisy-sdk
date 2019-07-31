/** @module common */

exports.TYPES = {
  EIP712Domain: [{ name: "verifyingContract", type: "address" }],

  Subscription: [
    { name: "subscriber", type: "address" },
    { name: "token", type: "address" },
    { name: "price", type: "uint256" },
    { name: "periodUnit", type: "string" },
    { name: "periods", type: "uint256" },
    { name: "maxExecutions", type: "uint256" },
    { name: "plan", type: "string" },
  ],

  CreateSubscription: [
    { name: "subscription", type: "Subscription" },
    { name: "previousSubscriptionId", type: "bytes32" },
    { name: "credits", type: "uint256" },
    { name: "nonce", type: "bytes32" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  RemovePlan: [
    { name: "plan", type: "string" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  CancelSubscription: [
    { name: "subscriptionId", type: "bytes32" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  SetAuthorizer: [
    { name: "authorizer", type: "address" },
    { name: "nonce", type: "bytes32" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  SetWallet: [
    { name: "wallet", type: "address" },
    { name: "nonce", type: "bytes32" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],
};

/**
 * @async
 * @private
 */
exports.signTypedData = function signTypedData(web3, signer, data) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        method: "eth_signTypedData_v3",
        params: [signer, JSON.stringify(data)],
        from: signer,
      },
      function callback(err, result) {
        if (err || result.error) {
          return reject(err || result.error);
        }

        const signature = result.result;
        return resolve(signature);
      }
    );
  });
};

/**
 * Generate nonce
 * @see {@link https://github.com/ethereum/web3.js/issues/1490}
 * @private
 * @param {number} [len=32] - nonce expected length.
 * @returns {string} nonce with length.
 */
exports.genNonce = function genNonce(web3, len = 32) {
  let value = null;
  do {
    value = web3.utils.randomHex(len);
  } while (value.length !== len * 2 + 2); // +2 because of "0x"
  return value;
};
