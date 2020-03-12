/** @module private */

const Signer = require("./Signer");
const DaisySubscriptions = require("../common/DaisySubscriptions");
const { ZERO_ADDRESS } = require("../common/helpers");

class ServerSubscriptions extends DaisySubscriptions {
  /**
   * Authorize a private plan
   * @async
   * @private
   * @param {Object} authorizer - Authorizer, must match the `authorizer` address in Daisy dashboard.
   * @param {string} authorizer.privateKey - Buffer, use `Buffer.from("PRIVATE_KEY", "hex")`.
   * @param {Object} agreement - From {@link module:browser.DaisySDKToken#sign}.
   * @param {Object} [opts] - Additional options.
   * @param {boolean} [opts.allowAnyAddress=false] - True if any address can use the authorizer signature to join a private plan.
   * @returns {string} - authSignature. Use in {@link module:common~SubscriptionProductClient#submit} as `authSignature`.
   */
  authorize(authorizer, agreement, opts = { allowAnyAddress: false }) {
    if (!authorizer || !authorizer.privateKey) {
      throw new TypeError("Missing authorizer.privateKey");
    }
    return this.getData().then(manager => {
      // Sign private plan using authorizer private key.
      const signer = new Signer(authorizer.privateKey, manager["address"]);
      return signer.signTypedData("Subscription", {
        ...agreement,
        subscriber: opts.allowAnyAddress ? ZERO_ADDRESS : agreement.subscriber,
      });
    });
  }

  /**
   * Create an invitation link
   * @async
   * @param {Object|string} plan - Plan object or plan.id string.
   * @param {Object} [params={}] - Invitation attributes.
   * @param {Boolean} [params.active=true] - Is public available or not.
   * @param {Number} [params.maxUsages=0] - Invitation max allowed usages. Set to `0` for unlimited.
   * @param {Object} [params.webhooksExtra] - Extra payload, helpful to identify the user.
   * @param {String} [params.redirectURL] - To redirect the user after a successful/failed checkout.
   * @param {String} [params.cancelURL] - Allow the user to go back to merchant site.
   * @param {String} [params.freeTrialPeriods="0"] - Set to enable free trials.
   * @param {String} [params.freeTrialPeriodsUnit="MONTH"] - Free trial period. Enum: `DAY`, `WEEK`, `MONTH`.
   * @returns {Promise<Invitation>} - Invitation object ({@link module:common~Invitation}) with public link and identifier.
   */
  createInvitation(plan, params = { active: true, maxUsages: 0 }) {
    if (!plan) {
      throw new TypeError("Missing first argument: plan");
    }

    const data = {
      active: params["active"],
      maxUsages: Number(params["maxUsages"]),
      webhooksExtra: params["webhooksExtra"]
        ? JSON.parse(JSON.stringify(params["webhooksExtra"]))
        : undefined, // TODO: check if plan JS Object.
      redirectURL: params["redirectURL"],
      cancelURL: params["cancelURL"],
      freeTrialPeriods: params["freeTrialPeriods"],
      freeTrialPeriodsUnit: params["freeTrialPeriodsUnit"],
    };
    const planId = plan["id"] || plan;

    return this.request({
      method: "post",
      url: `/plans/${planId}/invitations/`,
      data,
    }).then(({ data: body }) => body.data);
  }
}

module.exports = ServerSubscriptions;
