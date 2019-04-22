/** @module private */

const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");

const SubscriptionProductClient = require("../common/SubscriptionProductClient");
const { TYPES } = require("../common/helpers");

/**
 * ServiceSubscriptions class
 * @extends module:common~SubscriptionProductClient
 */
class ServiceSubscriptions extends SubscriptionProductClient {
  /**
   * Authorize a private plan. Using this over a non-private plan is safe.
   * @async
   * @param {Object} authorizer - Authorizer, must match the `authorizer` address in Daisy dashboard.
   * @param {string} authorizer.privateKey - Buffer, use `Buffer.from("PRIVATE_KEY", "hex")`.
   * @param {Object} agreement - From {@link module:browser.DaisySDKToken#sign}.
   * @returns {string} - authSignature. Use in {@link module:common~SubscriptionProductClient#submit} as `authSignature`.
   */
  authorize(authorizer, agreement) {
    if (!authorizer || !authorizer.privateKey) {
      throw new Error("Missing authorizer.privateKey");
    }
    return this.getPlans().then(manager => {
      // Sign private plan using authorizer private key.
      const signer = new Signer(authorizer.privateKey, manager["address"]);
      const subscriptionHash = signer.hash("Subscription", agreement);
      return signer.signTypedData("PlanAuthorization", {
        subscriptionHash,
      });
    });
  }
}

/**
 * @private
 */
class Signer {
  constructor(privateKey, subscriptionManagerAddress) {
    this.privateKey = privateKey;
    this.domain = {
      verifyingContract: subscriptionManagerAddress,
    };
  }

  signTypedData(type, message) {
    const data = {
      types: TYPES,
      domain: this.domain,
      primaryType: type,
      message,
    };

    return sigUtil.signTypedData(this.privateKey, {
      data,
    });
  }

  hash(type, message) {
    const buf = sigUtil.TypedDataUtils.hashStruct(type, message, TYPES);
    return ethUtil.bufferToHex(buf);
  }
}

module.exports = ServiceSubscriptions;
