/** @module private */

const sigUtil = require("eth-sig-util");
const { TYPES } = require("../common/helpers");

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
}

module.exports = Signer;
