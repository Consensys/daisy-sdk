const ERC20 = require("./contracts/lite/ERC20");
const networks = require("./contracts/lite");

module.exports = class ForgeSDK {
  constructor(web3, options = { network: "mainnet" }) {
    this.web3 = web3;
    this.options = options;
    this.addresses = networks[options.network];
  }

  Token(symbol) {
    return this.web3.eth.Contract(ERC20["abi"], this.addresses[symbol]);
  }

  prepareToken(token) {
    return new TokenApproval(token, this.options);
  }
};

class TokenApproval {
  constructor(token, options = { network: "mainnet" }) {
    this.token = token;
    this.options = options;
    this.addresses = networks[options.network];
  }

  approve(amount, sendArgs) {
    if (!sendArgs.from) {
      throw new Error();
    }
    return this.token.methods
      .approve(this.addresses["subscription-manager"], amount)
      .send(sendArgs);
  }
}
