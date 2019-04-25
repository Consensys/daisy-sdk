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

exports.withNetworkCheck = function withNetworkCheck(SDK) {
  function checkNetwork(SDK, fn) {
    SDK.fn = function() {
      console.log("Wrapped fn called!!!!!!!!!!!!");
      if (this.web3) {
        const networks = {
          "https://sdk.daisypayments.com": "main",
          "https://sdk.staging.daisypayments.com": "rinkeby",
          "http://localhost:8000": "private",
        };
        this.web3.eth.net.getNetworkType().then(network => {
          const { baseURL } = this.config;
          if (network === networks[baseURL]) {
            fn(...arguments);
          } else {
            console.error(
              `DaisySDK: Requests failing because web3 object is connected to the incorrect
              network: ${network}. DaisySDK was instantiatd to make API calls to ${baseURL},
              which requires MetaMask to be pointed to ${networks[baseURL]}`
            );
          }
        });
      }
    };
  }

  let methods = [];
  // do {
  //   methods = methods.concat(Object.getOwnPropertyNames(DaisySDK));
  // } while (DaisySDK = Object.getPrototypeOf(DaisySDK));
  methods = methods.concat(Object.getOwnPropertyNames(SDK.prototype));
  methods = methods.concat(
    Object.getOwnPropertyNames(Object.getPrototypeOf(SDK.prototype))
  );
  debugger;
  for (const method in methods) {
    // if (typeof DaisySDK[method] === "function") {
    checkNetwork(SDK, fn);
    // }
  }
  return SDK;
};
