/** @module private */

const sigUtil = require("eth-sig-util");
const ethUtil = require("ethereumjs-util");
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

  hash(type, message) {
    const buf = sigUtil.TypedDataUtils.hashStruct(type, message, TYPES);
    return ethUtil.bufferToHex(buf);
  }
}

module.exports = Signer;
