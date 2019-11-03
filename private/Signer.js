/** @module private */

const sigUtil = require("eth-sig-util");
const { EIP712Types } = require("@daisypayments/smart-contracts/eip712");

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
      types: EIP712Types,
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
