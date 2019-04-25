/** @module browser */

import EventEmitter from "eventemitter3";

import ERC20 from "../contracts/lite/ERC20.json";
import {
  TYPES,
  signTypedData,
  transformPeriod,
  genNonce,
  withNetworkCheck,
} from "../common/helpers";
import SubscriptionProductClient from "../common/SubscriptionProductClient";

/**
 * Web3 uses a hybrid Promise/Callback/EventEmitter mechanism.
 * @external PromiEvent
 * @see {@link https://web3js.readthedocs.io/en/1.0/callbacks-promises-events.html#promievent|Documentation}
 * @see {@link https://github.com/ethereum/web3.js/blob/1.0/packages/web3-core-method/lib/PromiEvent.js|Source-code}
 */

/**
 * Web3 contract class that creates an instance based on a address and an ABI.
 * @external "web3.eth.Contract"
 * @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#web3-eth-contract|Documentation}
 */

/**
 * @typedef {Object} SignResult
 * @property {Object} agreement Object required in the {@link module:private~ServiceSubscriptions#authorize} and {@link module:common~SubscriptionProductClient#submit}.
 * @property {string} signature The `agreement` after being signed by the user using MetaMask.
 */

/**
 * Browser SDK class. This requires a {@link module:common~SubscriptionManager} object to be instantiated and a `web3` instance.
 * The `web3` instance should come from [react-metamask](https://github.com/tokenfoundry/react-metamask).
 * @see {@link module:browser~DaisySDK#sync} for info about syncing with Daisy services.
 * @extends module:common~SubscriptionProductClient
 */
class DaisySDK extends SubscriptionProductClient {
  constructor(manager, web3, override) {
    super(manager, override);
    this.manager = manager;
    this.web3 = web3;
  }

  /**
   * If this class is instantiated only with {@link module:common~SubscriptionManager#identifier}
   * this call is necessary to fetch the subscription's manager data.
   * @async
   * @returns {this} - Return self instance.
   *
   * @example
   *
   * const daisy = new DaisySDK({ identifier: ... }, web3);
   * await daisy.sync() // required
   *
   * @example
   *
   * const daisy = new DaisySDK(manager, web3); // not required here.
   *
   */
  sync() {
    return this.request({
      method: "get",
      url: "/",
    }).then(({ data: body }) => {
      this.manager = body["data"];
      return this;
    });
  }

  /**
   * Load token's web3 contract as {@link external:"web3.eth.Contract"}.
   * @param {Object} [input={}] - Optional input argument.
   * @param {string} [input.symbol] - Load a ERC20 token with Web3 using its symbol.
   * @param {string} [input.address] - Load a ERC20 token with Web3 using its address.
   * @returns {external:"web3.eth.Contract"} - Ethereum contract.
   *
   * @example
   *
   * const daisy = new DaisySDK({
   *   identifier: process.env.DAISY_ID,
   * }, web3);
   * await daisy.sync(); // load manager
   *
   * const token = daisy.loadToken(); // the token is taken from the `manager`.
   */
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

  /**
   * Takes an Web3's contract instance and wraps it into a {@link module:browser.DaisySDKToken}.
   * @param {external:"web3.eth.Contract"} token - Web3's contract instance from {@link module:browser~DaisySDK#loadToken}.
   * @returns {module:browser.DaisySDKToken} Wrapped token.
   */
  prepareToken(token) {
    return new DaisySDKToken(this.web3, this.manager, token);
  }
}

/**
 * DaisySDK class related to token operations. This should NOT be instantiated directly.
 * Use {@link module:browser~DaisySDK#prepareToken} to get an instance of this class.
 *
 * @example
 *
 * import DaisySDK from "daisy-sdk/browser";
 *
 * const web3 = ...; // we recommend getting `web3` from [react-metamask](https://github.com/tokenfoundry/react-metamask)
 * const daisy = new DaisySDK({
 *   identifier: process.env.DAISY_ID,
 * }, web3);
 * await daisy.sync(); // load manager
 *
 * // the token address is taken from the `manager`.
 * const token = daisy.prepareToken(daisy.loadToken());
 * console.log(token instanceof DaisySDKToken);
 * // > true
 */
export class DaisySDKToken {
  /**
   * @private
   */
  constructor(web3, manager, token) {
    this.token = token;
    this.web3 = web3;
    this.manager = manager;
  }

  /**
   * Approve a token with MetaMask
   * @param {string|number} amount - Amounts of tokens to approve. It can be more tokens than the current amount the user has.
   * @param {Object} [sendArgs] - Optional Web3 arguments for transactions. @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#methods-mymethod-send|web3js.readthedocs}
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. See the example for the returned values.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/tokenfoundry/react-metamask)
   * const token = daisy.loadToken(); // web3 contract instance.
   * const amount = 100000; // defined by user. We recommend a very big number.
   *
   * daisy
   *   .prepareToken(token)
   *   .approve(amount, { from: account })
   *   .on("transactionHash", transactionHash => {})
   *   .on("confirmation", (confirmationNumber, receipt) => {})
   *   .on("receipt", receipt => {})
   *   .on("error", error => {});
   */
  approve(amount, sendArgs) {
    if (!sendArgs.from) {
      throw new Error();
    }
    return this.token.methods["approve"](this.manager["address"], amount).send(
      sendArgs
    );
  }

  /**
   * Allows you to resume a {@link module:browser.DaisySDKToken#approve} transaction.
   * You need to store the `receipt` from the `.on("confirmation", (confirmationNumber, receipt) => {})` handler and pass it here as the first argument.
   * Also you can use the `transactionHash` from `.on("transactionHash", transactionHash => {})`.
   * See example.
   * @param {Object} receipt - `receipt` or `transactionHash` from {@link module:browser.DaisySDKToken#approve} transaction.
   * @returns {EventEmitter} - Event emitter similar to {@link external:PromiEvent} but please only use event listeners (`.on(...)`).
   */
  resume(receipt) {
    if (!receipt) {
      throw new Error("Missing argument.");
    }
    const transactionHash = receipt["transactionHash"] || receipt;

    const emitter = new ResumeEventEmitter(this.web3, transactionHash);
    emitter.start();
    return emitter;
  }

  /**
   * Sign cancel agreement with MetaMask
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Ethereum address, beneficiary of the subscription.
   * @param {string} input.subscriptionHash - Comes from {@link module:common~Subscription#subscriptionHash}.
   * @param {string|number} [input.signatureExpiresAt=Date.now() + 600000] - Expiration date for the signature in milliseconds (internally it's converted to seconds for the blockchain). By default its 10 minutes from now.
   * @returns {Object} Object with `signature` property.
   */
  signCancel(account, subscriptionHash, signatureExpiresAt) {
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

    return signTypedData(this.web3, account, typedData).then(signature => ({
      signature,
    }));
  }

  /**
   * Sign agreement with MetaMask
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Ethereum address it is going to benefit from the subscription.
   * @param {Plan} input.plan - The `Plan` object the user is going to sign for.
   * @param {string|number} [input.signatureExpiresAt=Date.now() + 600000] - Expiration date for the signature in milliseconds (internally it's converted to seconds for the blockchain). By default its 10 minutes from now.
   * @param {string|number} [input.maxExecutions=0] - Number of periods the user wants to subscribe. If `0` it will renew indefinitely. Example: if a {@link module:common~Plan} has `2` `DAYS` as {@link module:common~Plan#period} and {@link module:common~Plan#periodUnit}, setting this to `3` means that the subscription will last 6 days.
   * @param {string} [input.nonce=web3.utils.randomHex(32)] - Computed. Open for development purposes only.
   * @returns {module:browser~SignResult} This result is going to be used in {@link module:private~ServiceSubscriptions#authorize} and/or in {@link module:common~SubscriptionProductClient#submit}.
   */
  sign({
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
      nonce: nonce || genNonce(this.web3),
    };

    const typedData = {
      types: TYPES,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "Subscription",
      message: agreement,
    };

    return signTypedData(this.web3, account, typedData).then(signature => ({
      signature,
      agreement,
    }));
  }
}

/**
 * {@link external:PromiEvent|PromiEvent} wannabe.
 * @private
 */
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

  /**
   * @async
   */
  execute() {
    if (!this.started) {
      return;
    }

    let receipt = null;

    /* eslint-disable consistent-return */
    return this.web3.eth
      .getTransaction(this.transactionHash)
      .then(transaction => {
        if (transaction === null || transaction.blockNumber === null) {
          // not mined yet.
          throw new Error("Not mined yet. Retry.");
        }
        receipt = transaction;

        return this.web3.eth.getBlockNumber();
      })
      .then(currentBlock => {
        const confirmationNumber = currentBlock - receipt["blockNumber"];

        this.emit("confirmation", confirmationNumber, receipt);
        return receipt;
      })
      .catch(error => {
        this.emit("error", error);
        return null;
      })
      .then(value => {
        if (this.started) {
          setTimeout(this.execute.bind(this), 3000);
        }
        return value;
      });
  }
}

export default withNetworkCheck(DaisySDK);
