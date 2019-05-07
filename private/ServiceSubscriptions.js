/** @module private */

const Signer = require("./Signer");
const SubscriptionProductClient = require("../common/SubscriptionProductClient");

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
    return this.getData().then(manager => {
      // Sign private plan using authorizer private key.
      const signer = new Signer(authorizer.privateKey, manager["address"]);
      const subscriptionHash = signer.hash("Subscription", agreement);
      return signer.signTypedData("PlanAuthorization", {
        subscriptionHash,
      });
    });
  }
}

module.exports = ServiceSubscriptions;
