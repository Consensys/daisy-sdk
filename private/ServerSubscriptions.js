/** @module private */

const Signer = require("./Signer");
const ClientSubscriptions = require("../common/ClientSubscriptions");
const { ZERO_ADDRESS } = require("../common/helpers");

class ServerSubscriptions extends ClientSubscriptions {
  constructor({ manager, override, withGlobals }) {
    super(manager, override, withGlobals);
    this.manager = manager;
    this.override = override;
  }

  sync() {
    return this.request({
      method: "get",
      url: "/",
    }).then(({ data: body }) => {
      this.manager = {
        ...this.manager,
        ...body["data"],
        identifier: this.manager["identifier"],
        secretKey: this.manager["secretKey"],
      };
      return this;
    });
  }

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
   * @param {Object} [params.callbackExtra={}] - Extra payload, helpful to identify the user.
   * @param {String} [params.callbackURL] - Callback URL to receive Daisy ID from the subscription
   * @param {String} [params.redirectURLDefault] - On success default redirect button.
   * @returns {Promise<Invitation>} - Invitation object ({@link module:common~Invitation}) with public link and identifier.
   */
  createInvitation(
    plan,
    params = { active: true, maxUsages: 0, callbackExtra: {} }
  ) {
    if (!plan) {
      throw new TypeError("Missing first argument: plan");
    }

    const data = {
      maxUsages: Number(params["maxUsages"]),
      active: params["active"],
      callbackExtra: JSON.parse(JSON.stringify(params["callbackExtra"])), // TODO: check if plan JS Object.
      callbackURL: params["callbackURL"],
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

module.exports = ServerSubscriptions;
