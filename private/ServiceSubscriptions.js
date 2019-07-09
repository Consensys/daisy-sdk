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
   * @param {Object} [opts] - Additional options.
   * @param {boolean} [opts.allowAnyAddress=false] - True if any address can use the authorizer signature to join a private plan.
   * @returns {string} - authSignature. Use in {@link module:common~SubscriptionProductClient#submit} as `authSignature`.
   */
  authorize(authorizer, agreement, opts = { allowAnyAddress: false }) {
    if (!authorizer || !authorizer.privateKey) {
      throw new Error("Missing authorizer.privateKey");
    }
    return this.getData().then(manager => {
      // Sign private plan using authorizer private key.
      const signer = new Signer(authorizer.privateKey, manager["address"]);
      return signer.signTypedData("Subscription", {
        ...agreement,
        subscriber: opts.allowAnyAddress
          ? SubscriptionProductClient.ZERO_ADDRESS
          : agreement.subscriber,
      });
    });
  }

  /**
   * Create an invitation link
   * @async
   * @param {Object|string} plan - Plan object or plan.id string.
   * @param {Object} [params={}] - Plan attributes.
   * @returns {Promise<Invitation>} - Invitation object with public link and identifier.
   */
  createInvitation(plan, params = {}) {
    if (!plan) {
      throw new Error("Missing first argument: plan");
    }

    const data = {
      maxUsages: params["maxUsages"] ? String(params["maxUsages"]) : "0",
      active: params["active"],
      callbackURL: params["callbackURL"],
      callbackExtra: params["callbackExtra"], // check if plan JS Object.
      redirectURLDefault: params["redirectURLDefault"],
    };
    const planId = plan["id"] || plan;

    return this.request({
      method: "post",
      url: `/plans/${planId}/invitations/`,
      data,
    }).then(({ data: body }) => body.data);
  }
}

module.exports = ServiceSubscriptions;
