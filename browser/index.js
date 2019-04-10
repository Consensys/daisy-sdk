import isString from "lodash/isString";
import EventEmitter from "eventemitter3";

import ERC20 from "../contracts/lite/ERC20.json";
import { TYPES, signTypedData } from "../common/helpers";
import { Client } from "./Client";

export default class DaisySDK extends Client {
  constructor(identifier, web3, manager) {
    super({
      ...Client.DEFAULT_CONFIG,
      // TODO: safer url compose
      baseURL: `${Client.DEFAULT_CONFIG.baseURL}`,
      auth: {
        username: identifier,
      },
    });
    this.web3 = web3;
    this.manager = manager;
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

  async submit({
    plan,
    account,
    startDate = "0",
    maxExecutions = "0",
    nonce,
    receipt,
    signature,
  }) {
    const { data: body } = await this.request({
      method: "post",
      url: "/subscriptions/",
      data: {
        planId: plan["id"] || plan,
        account,
        startDate,
        maxExecutions,
        nonce,
        receipt,
        signature,
      },
    });
    return body;
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

  async sign({
    account,
    plan,
    maxExecutions = "0",
    start = "0",
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

    // Subscription object
    const sub = {
      token: this.token.options.address,
      amount: plan["price"],
      periodUnit,
      periods,
      maxExecutions,
      start,
      plan: plan["onChainId"],
      nonce: nonce || genNonce(),
    };

    const typedData = {
      types: TYPES,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "Subscription",
      message: sub,
    };

    const signature = await signTypedData(this.web3, account, typedData);
    return { signature, nonce: sub.nonce };
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

function transformPeriod(number, unit) {
  // export enum PeriodUnit {
  //   Days = "DAYS",
  //   Weeks = "WEEKS",
  //   Months = "MONTHS",
  //   Years = "YEARS",
  // }
  switch (unit) {
    case "DAYS":
      return [number, "Day"];
    case "WEEKS":
      return [number, "Day"];
    case "MONTHS":
      return [number, "Month"];
    case "YEARS":
      return [number, "Year"];
    default:
      throw new Error();
  }
}
