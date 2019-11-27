/** @module browser */

import { EIP712Types } from "@daisypayments/smart-contracts/eip712";
import EventEmitter from "eventemitter3";

import ERC20 from "../contracts/lite/ERC20.json";
import {
  genNonce,
  getExpirationInSeconds,
  signTypedData,
} from "../common/helpers";
import ClientSubscriptions from "../common/ClientSubscriptions";

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
 * @property {Object} agreement Object required in the {@link module:private~ServiceSubscriptions#authorize} and {@link module:common~ClientSubscriptions#submit}.
 * @property {string} signature The `agreement` after being signed by the user using Metamask.
 */

/**
 * Browser SDK class. This requires a {@link module:common~SubscriptionManager} object to be instantiated and a `web3` instance.
 * The `web3` instance should come from [react-metamask](https://github.com/consensys/react-metamask).
 * @see {@link module:browser~DaisySDK#sync} for info about syncing with Daisy services.
 * @extends module:common~ClientSubscriptions
 */
export default class DaisySubscriptions extends ClientSubscriptions {
  get web3() {
    return this.withGlobals.web3 || window.web3;
  }

  constructor({ manager, override, withGlobals }) {
    super(manager, override, withGlobals);
    this.manager = manager;
    this.override = override;
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
      this.manager = { ...this.manager, ...body["data"] };
      return this;
    });
  }

  /**
   * Load token's web3 contract as {@link external:"web3.eth.Contract"}.
   * @param {Object} plan - Plan object.
   * @returns {external:"web3.eth.Contract"} - Ethereum contract.
   *
   * @example
   *
   * const daisy = new DaisySDK({
   *   identifier: process.env.DAISY_ID,
   * }, web3);
   * await daisy.sync(); // load manager
   *
   * const token = daisy.loadToken(plan); // the token is taken from the plan object.
   */
  loadToken(plan) {
    if (!plan) {
      throw new TypeError("Plan argument missing.");
    }
    return new this.web3.eth.Contract(ERC20["abi"], plan["tokenAddress"]);
  }

  /**
   * Takes an Web3's contract instance and wraps it into a {@link module:browser.DaisySubscriptionsOnToken}.
   * @param {external:"web3.eth.Contract"} token - Web3's contract instance from {@link module:browser~DaisySDK#loadToken}.
   * @returns {module:browser.DaisySubscriptionsOnToken} Wrapped token.
   */
  prepareToken(token) {
    return new DaisySubscriptionsOnToken({
      withGlobals: this.withGlobals,
      override: this.override,
      manager: this.manager,
      token,
    });
  }

  /**
   * Allows you to resume a {@link module:browser.DaisySubscriptionsOnToken#approve} transaction.
   * You need to store the `receipt` from the `.on("confirmation", (confirmationNumber, receipt) => {})` handler and pass it here as the first argument.
   * Also you can use the `transactionHash` from `.on("transactionHash", transactionHash => {})`.
   * See example.
   * @param {Object} receipt - `receipt` or `transactionHash` from {@link module:browser.DaisySubscriptionsOnToken#approve} transaction.
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
   * Sign cancel agreement wit Metamask
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Ethereum address, beneficiary of the subscription.
   * @param {string} input.onChainId - Comes from {@link module:common~Subscription#onChainId}.
   * @param {string|number} [input.signatureExpiresAt=Date.now() + 600000] - Expiration date for the signature in milliseconds (internally it's converted to seconds for the blockchain). By default its 10 minutes from now.
   * @returns {Promise<Object>} Object with `signature` and `agreement` property.
   */
  signCancel({ account, onChainId, signatureExpiresAt }) {
    const agreement = {
      subscriptionId: onChainId,
      nonce: "0x0",
      signatureExpiresAt: getExpirationInSeconds(signatureExpiresAt),
    };
    const typedData = {
      types: EIP712Types,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "CancelSubscription",
      message: agreement,
    };

    return signTypedData(this.web3, account, typedData).then(signature => ({
      agreement,
      signature,
    }));
  }

  /**
   * Sign payload to remove a plan
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Ethereum address must match {@link module:common~SubscriptionManager#publisher}.
   * @param {Plan} input.plan - The `Plan` object the publisher is going to sign for.
   * @param {string|number|Date} [input.signatureExpiresAt=Date.now() + 600000] - Expiration date for the signature in milliseconds (internally it's converted to seconds for the blockchain). By default its 10 minutes from now.
   * @returns {Promise<Object>} Object with `signature` and the raw `agreement` that was signed.
   */
  signRemovePlan({ account, plan, signatureExpiresAt }) {
    // TODO: check if `account` is the same as `publisher`.

    const expiration = getExpirationInSeconds(signatureExpiresAt);

    const agreement = {
      plan: plan["onChainId"],
      nonce: "0x0",
      signatureExpiresAt: expiration,
    };

    const typedData = {
      types: EIP712Types,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "RemovePlan",
      message: agreement,
    };

    return signTypedData(this.web3, account, typedData).then(signature => ({
      signature,
      agreement,
    }));
  }

  /**
   * Sign agreement wit Metamask with the `authorizer` account.
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Signer address.
   * @param {Object} input.agreement - The `agreement` object from the `sign` step.
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:common~ClientSubscriptions#submit}.
   */
  signAuthorization({ account, agreement }) {
    const typedData = {
      types: EIP712Types,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "CreateSubscription",
      message: agreement,
    };

    return signTypedData(this.web3, account, typedData).then(signature => ({
      signature,
      agreement,
    }));
  }

  /**
   * Sign set wallet agreement with Metamask with the `owner` account.
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Signer address.
   * @param {Object} input.wallet - The wallet to be set.
   * @param {Object} [input.signatureExpiresAt=Date.now() + 600000] - The timestamp in miliseconds in which the signature is no longer valid.
   * @param {string} [input.nonce=web3.utils.randomHex(32)] - Computed. Open for development purposes only.
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:common~ClientSubscriptions#submit}.
   */
  signSetWallet({ account, wallet, signatureExpiresAt, nonce = undefined }) {
    const expiration = getExpirationInSeconds(signatureExpiresAt);

    const agreement = {
      wallet,
      nonce: nonce || genNonce(this.web3),
      signatureExpiresAt: expiration,
    };

    const typedData = {
      types: EIP712Types,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "SetWallet",
      message: agreement,
    };

    return signTypedData(this.web3, account, typedData).then(signature => ({
      signature,
      agreement,
    }));
  }

  /**
   * Sign set authorizer agreement wit Metamask with the `owner` account.
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Signer address.
   * @param {Object} input.authorizer - The authorizer to be set.
   * @param {Object} [input.signatureExpiresAt=Date.now() + 600000] - The timestamp in miliseconds in which the signature is no longer valid.
   * @param {string} [input.nonce=web3.utils.randomHex(32)] - Computed. Open for development purposes only.
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:common~ClientSubscriptions#submit}.
   */
  signSetAuthorizer({
    account,
    authorizer,
    signatureExpiresAt,
    nonce = undefined,
  }) {
    const expiration = getExpirationInSeconds(signatureExpiresAt);

    const agreement = {
      authorizer,
      nonce: nonce || genNonce(this.web3),
      signatureExpiresAt: expiration,
    };

    const typedData = {
      types: EIP712Types,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "SetAuthorizer",
      message: agreement,
    };

    return signTypedData(this.web3, account, typedData).then(signature => ({
      signature,
      agreement,
    }));
  }
}

/**
 * DaisySDK class related to token operations. This should NOT be instantiated directly.
 * Use {@link module:browser~DaisySDK#prepareToken} to get an instance of this class.
 *
 * @example
 *
 * import DaisySDK from "@daisypayments/daisy-sdk/browser";
 *
 * const web3 = ...; // we recommend getting `web3` from [react-metamask](https://github.com/consensys/react-metamask)
 * const daisy = new DaisySDK({
 *   identifier: process.env.DAISY_ID,
 * }, web3);
 * await daisy.sync(); // load manager
 *
 * // the token address is taken from the `manager`.
 * const token = daisy.prepareToken(daisy.loadToken(plan));
 * console.log(token instanceof DaisySubscriptionsOnToken);
 * // > true
 */
export class DaisySubscriptionsOnToken extends DaisySubscriptions {
  /**
   * @private
   */
  constructor({ manager, token, override, withGlobals }) {
    super({ manager, override, withGlobals });
    this.token = token;
  }

  /**
   * Approve a token with Metamask
   * @param {string|number} amount - Amounts of tokens to approve. It can be more tokens than the current amount the user has.
   * @param {Object} sendArgs - Web3 arguments for transactions. @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#methods-mymethod-send|web3js.readthedocs}
   * @param {string} sendArgs.from - User account Ethereum address.
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. See the example for the returned values.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/consensys/react-metamask)
   * const token = daisy.loadToken(plan); // web3 contract instance.
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
      throw new Error("Missing `sendArgs.from` argument");
    }
    return this.token.methods["approve"](this.manager["address"], amount).send(
      sendArgs
    );
  }

  /**
   * Check allowance that spender has given to subscription manager
   * @param {Object} sendArgs - Web3 arguments for transactions. @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#methods-mymethod-send|web3js.readthedocs}
   * @param {string} sendArgs.tokenOwner - User account Ethereum address.
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. Promise resolves to string representing how much of the ERC20 token the tokenOwner has approved the subscription manager to spend.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/consensys/react-metamask)
   * const token = daisy.loadToken(plan); // web3 contract instance.
   *
   * daisy
   *   .prepareToken(token)
   *   .allowance({ tokenOwner: account })
   */
  allowance(sendArgs) {
    if (!sendArgs.tokenOwner) {
      throw new Error(`allowance() was called without a tokenOwner specified. Be sure to call allowance() like:
      
      daisy
        .prepareToken(token)
        .allowance({ tokenOwner: account })
      
      `);
    }
    if (!this.manager["address"]) {
      throw new Error(
        `You are attempting to check how many tokens the subscription product "${
          this.manager["name"]
        }" is allowed to spend on behalf of ${
          sendArgs.tokenOwner
        }, but the address of "${
          this.manager["name"]
        }" is null. Are you sure that this subscription product is deployed?`
      );
    }
    return this.token.methods["allowance"](
      sendArgs.tokenOwner,
      this.manager["address"]
    ).call();
  }

  /**
   * Check balance of spender. Useful to prevent subscriber from submitting a signed agreement if they do not have sufficient funds
   * @param {Object} sendArgs - Web3 arguments for transactions. Must have tokenOwner field. @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#methods-mymethod-send|web3js.readthedocs}
   * @param {string} sendArgs.tokenOwner - User account Ethereum address.
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. Promise resolves to string representing account's balance of ERC20 token.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/consensys/react-metamask)
   * const token = daisy.loadToken(plan); // web3 contract instance.
   *
   * daisy
   *   .prepareToken(token)
   *   .balanceOf({ tokenOwner: account })
   */
  balanceOf(sendArgs) {
    if (!sendArgs.tokenOwner) {
      throw new Error(`balanceOf() was called without a tokenOwner specified. Be sure to call balanceOf() like:
      
      daisy
        .prepareToken(token)
        .balanceOf({ tokenOwner: account })
      
      `);
    }
    return this.token.methods["balanceOf"](sendArgs.tokenOwner).call();
  }

  /**
   * Sign agreement wit Metamask
   * @async
   * @param {Object} input - Input object
   * @param {string} input.account - Ethereum address it is going to benefit from the subscription.
   * @param {Plan} input.plan - The `Plan` object the user is going to sign for.
   * @param {string|number} [input.signatureExpiresAt=Date.now() + 600000] - Expiration date for the signature in milliseconds (internally it's converted to seconds for the blockchain). By default its 10 minutes from now.
   * @param {string|number} [input.maxExecutions=0] - Number of periods the user wants to subscribe. If `0` it will renew indefinitely. Example: if a {@link module:common~Plan} has `2` `DAY` as {@link module:common~Plan#periods} and {@link module:common~Plan#periodUnit}, setting this to `3` means that the subscription will last 6 days.
   * @param {string|number} [input.credits=0] - Amount of credits to add to the subscription.
   * @param {string} [input.nonce=web3.utils.randomHex(32)] - Computed. Open for development purposes only.
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:private~ServiceSubscriptions#authorize} and/or in {@link module:common~ClientSubscriptions#submit}.
   */
  sign({
    account,
    plan,
    signatureExpiresAt,
    maxExecutions = "0",
    credits = "0",
    nonce = undefined,
  }) {
    if (!account || !plan) {
      throw new Error(`Missing required arguments.`);
    }

    const expiration = getExpirationInSeconds(signatureExpiresAt);

    // Subscription object
    const agreement = {
      subscription: {
        subscriber: account,
        token: this.token.options.address,
        price: plan["price"],
        periodUnit: plan["periodUnit"],
        periods: plan["periods"],
        maxExecutions,
        plan: plan["onChainId"],
      },
      previousSubscriptionId: "0x0", // TODO: pass as parameter once it is implemented in the backend
      credits,
      nonce: nonce || genNonce(this.web3),
      signatureExpiresAt: expiration,
    };

    const typedData = {
      types: EIP712Types,
      domain: { verifyingContract: this.manager["address"] },
      primaryType: "CreateSubscription",
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
