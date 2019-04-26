exports.TYPES = {
  EIP712Domain: [{ name: "verifyingContract", type: "address" }],

  Subscription: [
    { name: "subscriber", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "periodUnit", type: "string" },
    { name: "periods", type: "uint256" },
    { name: "maxExecutions", type: "uint256" },
    { name: "plan", type: "string" },
    { name: "nonce", type: "bytes32" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  PlanAuthorization: [{ name: "subscriptionHash", type: "bytes32" }],

  AddPlan: [
    { name: "plan", type: "string" },
    { name: "price", type: "uint256" },
    { name: "periodUnit", type: "string" },
    { name: "periods", type: "uint256" },
    { name: "maxExecutions", type: "uint256" },
    { name: "private", type: "bool" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  RemovePlan: [
    { name: "plan", type: "string" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  SetActive: [
    { name: "plan", type: "string" },
    { name: "active", type: "bool" },
    { name: "nonce", type: "bytes32" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],

  SubscriptionAction: [
    { name: "action", type: "string" },
    { name: "subscriptionHash", type: "bytes32" },
    { name: "signatureExpiresAt", type: "uint256" },
  ],
};

exports.transformPeriod = function transformPeriod(number, unit) {
  // export enum PeriodUnit {
  //   Days = "DAYS",
  //   Weeks = "WEEKS",
  //   Months = "MONTHS",
  //   Years = "YEARS",
  // }
  switch (unit) {
    case "DAYS":
      return [number, "Day"];
    case "WEEKS":
      return [number, "Day"];
    case "MONTHS":
      return [number, "Month"];
    case "YEARS":
      return [number, "Year"];
    default:
      throw new Error();
  }
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

/**
 * Wraps all functions of SDK with a check that current web3 network matches config of instance. Wrapped functions are all async
 * @private
 * @param {DaisySDK}
 * @returns {DaisySDK}
 */
exports.withNetworkCheck = function withNetworkCheck(SDK) {
  function wrapNetworkCheck(fn) {
    const oldFn = SDK.prototype[fn];
    // eslint-disable-next-line no-param-reassign
    SDK.prototype[fn] = function checkNetwork(...args) {
      try {
        const networks = {
          "https://sdk.daisypayments.com": "main",
          "https://sdk.staging.daisypayments.com": "rinkeby",
          "http://localhost:8000": "private",
        };
        return this.web3.eth.net.getNetworkType().then(network => {
          const { baseURL } = this.config;

          /**
           * In the future, if subscriptions created in the admin panel can define the network they're deployed to, this check will have to be extended to be:
           *
           * if ((baseURL === "https://sdk.daisypayments.com" && network !== this.manager.network)
           *     || (baseURL !== "https://sdk.daisypayments.com" && network !== networks[baseURL])) {}
           *
           * Or something like that
           */

          if (network !== networks[baseURL]) {
            console.error(
              `DaisySDK: web3 requests will fail because web3 is connected to the incorrect network: ${network.toUpperCase()}. DaisySDK was instantiated to make API calls to ${baseURL}, which requires MetaMask to be pointed to ${networks[
                baseURL
              ].toUpperCase()}. You likely just need to change the network MetaMask is pointed to, or add/update/remove the override argument supplied to the DaisySDK constructor.`
            );
          }
          return oldFn.bind(this)(...args);
        });
      } catch (e) {
        console.error(e);
        return oldFn.bind(this)(...args);
      }
    };
  }

  let methods = [];
  let sdkPrototypes = SDK.prototype;

  // Get all methods, including inherited
  // eslint-disable-next-line no-cond-assign
  do {
    methods = methods.concat(Object.getOwnPropertyNames(sdkPrototypes));
  } while ((sdkPrototypes = Object.getPrototypeOf(sdkPrototypes).prototype));

  methods.forEach(method => wrapNetworkCheck(method));
  return SDK;
};
