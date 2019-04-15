import isString from "lodash/isString";
import EventEmitter from "eventemitter3";

import ERC20 from "../contracts/lite/ERC20.json";
import { TYPES, signTypedData, transformPeriod } from "../common/helpers";
import SubscriptionProductClient from "../common/SubscriptionProductClient";

export default class DaisySDK extends SubscriptionProductClient {
  constructor(manager, web3, override) {
    super(manager, override);
    this.manager = manager;
    this.web3 = web3;
  }

  async sync() {
    const { data: body } = this.request({
      method: "get",
      url: "/",
    });
    this.manager = body["data"];
    return this;
  }

  loadToken({ symbol, address } = {}) {
    if (address) {
      return new this.web3.eth.Contract(ERC20["abi"], address);
    } else if (symbol) {
      throw new Error("Not implemented yet");
    } else {
      return new this.web3.eth.Contract(
        ERC20["abi"],
        this.manager["tokenAddress"]
      );
    }
  }

  prepareToken(token) {
    return new DaisySDKToken(token, this.web3, this.manager);
  }
}

class DaisySDKToken {
  constructor(token, web3, manager) {
    this.token = token;
    this.web3 = web3;
    this.manager = manager;
  }

  approve(amount, sendArgs) {
    if (!sendArgs.from) {
      throw new Error();
    }
    return this.token.methods["approve"](this.manager["address"], amount).send(
      sendArgs
    );
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

  async signCancel(account, subscriptionHash, signatureExpiresAt) {
    const typedData = {
      types: TYPES,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "SubscriptionAction",
      message: {
        action: "cancel",
        subscriptionHash,
        signatureExpiresAt,
      },
    };

    const signature = await signTypedData(this.web3, account, typedData);
    return { signature };
  }

  async sign({
    account,
    plan,
    signatureExpiresAt,
    maxExecutions = "0",
    nonce = undefined,
  }) {
    if (!account || !plan) {
      throw new Error(`Missing required arguments.`);
    }

    const [periods, periodUnit] = transformPeriod(
      plan["period"],
      plan["periodUnit"]
    ); // compatible with contract

    // TODO: https://github.com/ethereum/web3.js/issues/1490
    const genNonce = () => {
      let value = null;
      do {
        value = this.web3.utils.randomHex(32);
      } while (value.length !== 66);
      return value;
    };

    const EXPIRATION_TIME_TO_LIVE = 10 * 60 * 1000; // 10 minutes in milliseconds
    const expiration =
      (Number(signatureExpiresAt) || Date.now() + EXPIRATION_TIME_TO_LIVE) /
      1000; // unix timestamp in seconds

    // Subscription object
    const agreement = {
      subscriber: account,
      token: this.token.options.address,
      amount: plan["price"],
      periodUnit,
      periods,
      maxExecutions,
      signatureExpiresAt: String(Math.floor(expiration)),
      plan: plan["onChainId"],
      nonce: nonce || genNonce(),
    };

    const typedData = {
      types: TYPES,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "Subscription",
      message: agreement,
    };

    const signature = await signTypedData(this.web3, account, typedData);
    return { signature, agreement };
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
