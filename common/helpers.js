/** @module common */

/**
 * Web3 uses a hybrid Promise/Callback/EventEmitter mechanism.
 * @external PromiEvent
 * @see {@link https://web3js.readthedocs.io/en/1.0/callbacks-promises-events.html#promievent|Documentation}
 * @see {@link https://github.com/ethereum/web3.js/blob/1.0/packages/web3-core-method/lib/PromiEvent.js|Source-code}
 */

/**
 * Web3 contract class that creates an instance based on a address and an ABI.
 * @external "web3.eth.Contract"
 * @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#web3-eth-contract|Documentation}
 */

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Default void address
 */
exports.ZERO_ADDRESS = ZERO_ADDRESS;

exports.toData = function dat(response) {
  return response.data["data"];
};

exports.isBrowser = function isBrowser() {
  return typeof window !== "undefined";
};

exports.isEther = function isEther(address) {
  return !address || address === ZERO_ADDRESS;
};

exports.isObject = function isObject(something) {
  // eslint-disable-next-line lodash/prefer-lodash-typecheck
  return typeof something === "object"; // can be null
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

const EXPIRATION_TIME_TO_LIVE = 10 * 60 * 1000; // 10 minutes in milliseconds

exports.getExpirationInSeconds = function getExpirationInSeconds(
  signatureExpiresAt
) {
  return String(
    Math.floor(
      (Number(signatureExpiresAt) || Date.now() + EXPIRATION_TIME_TO_LIVE) /
        1000
    )
  ); // unix timestamp in seconds
};
