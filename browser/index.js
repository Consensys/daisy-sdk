import isString from "lodash/isString";
import EventEmitter from "eventemitter3";

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
    return this.token.methods["approve"](
      this.addresses["subscription-manager"],
      amount
    ).send(sendArgs);
  }

  async resume(arg) {
    let transactionHash = null;

    if (!arg) {
      throw new Error("Missing argument.");
    } else if (isString(arg)) {
      transactionHash = arg;
    } else {
      transactionHash = arg["transactionHash"];
    }

    const emitter = new ResumeEventEmitter(this.web3, transactionHash);
    emitter.start();
    return emitter;
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

class ResumeEventEmitter extends EventEmitter {
  constructor(web3, transactionHash, ...args) {
    super(...args);
    this.web3 = web3;
    this.transactionHash = transactionHash;
    this.started = false;
    // this.on("newListener", this._newListener.bind(this));
    // this.on("removeListener", this._removeListener.bind(this));
  }

  // _newListener() {
  //   console.log("_newListener");

  //   if (!this.started) {
  //     this.started = true;
  //     this.execute();
  //   }
  // }

  // _removeListener() {
  //   console.log("_removeListener");
  //   let count = 0;
  //   const names = this.eventNames() || [];
  //   for (const name of names) {
  //     count += this.listenerCount(name);
  //   }
  //   if (count === 0) {
  //     this.started = false;
  //   }
  // }

  start() {
    this.started = true;
    this.execute();
    return this;
  }

  async execute() {
    if (!this.started) {
      return;
    }

    try {
      const transaction = await this.web3.eth.getTransaction(
        this.transactionHash
      );
      if (transaction === null || transaction.blockNumber === null) {
        // not mined yet.
        throw new Error("Not mined yet. Retry.");
      }
      const blockNumber = transaction["blockNumber"];

      const currentBlock = await this.web3.eth.getBlockNumber();
      const confirmationNumber = currentBlock - blockNumber;

      const receipt = transaction;

      this.emit("confirmation", confirmationNumber, receipt);
    } catch (error) {
      this.emit("error", error);
    } finally {
      if (this.started) {
        setTimeout(this.execute.bind(this), 3000);
      }
    }
  }
}
