const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");

const SubscriptionProductClient = require("../common/SubscriptionProductClient");
const { TYPES } = require("../common/helpers");

class ServiceSubscriptions extends SubscriptionProductClient {
  /**
   * Authorize a private plan. Using this over a non-private plan is safe.
   * @param {Object} authorizer - Authorizer, must match the `authorizer` address in Daisy dashboard.
   * @param {string} authorizer.privateKey - Buffer, use `Buffer.from("PRIVATE_KEY", "hex")`.
   * @returns {string} - Signature. Use in `.submit()` as `authSignature`.
   */
  async authorize(authorizer, agreement) {
    if (!authorizer || !authorizer.privateKey) {
      throw new Error("Missing authorizer.privateKey");
    }
    const manager = await this.getPlans();

    // Sign private plan using authorizer private key.
    const signer = new Signer(authorizer.privateKey, manager["address"]);
    const subscriptionHash = signer.hash("Subscription", agreement);
    const authSignature = await signer.signTypedData("PlanAuthorization", {
      subscriptionHash,
    });
    return authSignature;
  }
}

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
