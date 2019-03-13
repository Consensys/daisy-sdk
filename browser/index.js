import ERC20 from "../contracts/lite/ERC20.json";
import * as networks from "../contracts";
import { TYPES, getTypedData, signTypedData } from "../common/helpers";

export default class DaisySDK {
  constructor(web3, options = { network: "mainnet" }) {
    this.web3 = web3;
    this.options = options;
    this.addresses = networks[options.network];
  }

  loadToken(symbol) {
    return new this.web3.eth.Contract(ERC20["abi"], this.addresses[symbol]);
  }

  prepareToken(token) {
    return new DaisySDKToken(token, this.web3, this.options);
  }
}

class DaisySDKToken {
  constructor(token, web3, options = { network: "mainnet" }) {
    this.token = token;
    this.web3 = web3;
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

  async sign({ account, plan }) {
    const transferFromSelector = this.web3.eth.abi.encodeFunctionSignature(
      "transferFrom(address,address,uint256)"
    );

    const price = 10;
    const wallet = "0xa7c32Fa000305CB2e5AA5d87B95560b4c14de045";
    const transferParams = this.web3.eth.abi.encodeParameters(
      ["address", "address", "uint256"],
      [account, wallet, String(price)]
    );

    const tokenTransferData = `${transferFromSelector}${transferParams.slice(
      2
    )}`;

    const meta = {
      planId: this.web3.utils.soliditySha3(plan["name"] || plan),
      startDate: 0,
      expires: 0,
    };

    // Subscription object
    const sub = {
      to: this.token.options.address,
      value: 0,
      data: tokenTransferData,
      operation: 0,
      txGas: 100000,
      dataGas: 0,
      gasPrice: 0,
      gasToken: "0x0000000000000000000000000000000000000000",
      refundAddress: "0x0000000000000000000000000000000000000000",
      meta,
    };

    const subscriptionManager = this.addresses["subscription-manager"];
    const typedData = getTypedData(
      TYPES,
      { verifyingContract: subscriptionManager },
      "Subscription",
      sub
    );

    const signature = await signTypedData(this.web3, account, typedData);
    return signature;
  }
}
