/** @module common */

const EventEmitter = require("eventemitter3");
const { EIP712Types } = require("@daisypayments/smart-contracts/eip712");
const ClientSDK = require("./ClientSDK");
const {
  isObject,
  genNonce,
  getExpirationInSeconds,
  signTypedData,
} = require("./helpers");

/**
 * @typedef {Object} Plan - Daisy's Plan object. Can be retrieved using {@link module:common~DaisySubscriptions#getData}.
 * @property {string} id - ID.
 * @property {string} name - Plan name.
 * @property {string} onChainId - Plan ID in the Ethereum blockchain (internal use of the SDK).
 * @property {string} description - Plan description.
 * @property {string} price - Plan price in tokens (stored as string).
 * @property {number} periods - Number of periods in `periodUnit` between bill cycles.
 * @property {string} periodUnit - Period unit: DAY, MONTH, YEAR.
 * @property {string} maxExecutions - How many times the Plan is executed.
 * @property {boolean} private - If a Plan is private it requires a signature (with a private key) from the `authorizer` defined in the Subscription Manager.
 * @property {boolean} active - Is the plan enabled for subscriptions or disabled?.
 * @property {string} [txHash] - Transaction hash when it was deployed.
 * @property {Error|string} [error] - Error message (if any).
 * @property {string} state - Enum: `DRAFT`, `PENDING`, `DEPLOYED`, `FAILED`.
 * @property {string} removalState - Enum: `OK`, `PENDING`, `FAILED`.
 * @property {string} freeTrialPeriods - Defaults to "0".
 * @property {string} freeTrialPeriodsUnit - Defaults to MONTH (no free trial).
 * @property {string} tokenAddress - Token of payment
 * @property {Date|string} createdAt - Timestamp.
 * @property {Date|string} updatedAt - Timestamp.
 */

/**
 * @typedef {Object} Subscription
 * @property {string} daisyId - Daisy ID.
 * @property {string} account - Subscriber ethereum address.
 * @property {string} token - Token address.
 * @property {number|string} price - Approved tokens.
 * @property {number} periodUnit
 * @property {number} periods
 * @property {string} [signature] - Created when user signs the agreement at {@link module:browser.DaisySDKToken#sign}.
 * @property {string} signatureExpiresAt - UNIX Timestamp (in seconds for blockchain usage) when the `signature` field expires.
 * @property {number|string} maxExecutions - How many periods the subscription is for.
 * @property {string} [nextPayment] - UNIX Timestamp (in seconds for blockchain usage) when its the next billing cycle (approximation).
 * @property {Date|string} [nextPaymentDate] - Normal Date object representing the next billing cycle.
 * @property {string} [onChainId] - Identifier in the blockchain.
 * @property {string} [txHash] - Transaction hash after deploying the subscription.
 * @property {Error|string} [error] - Error message (if any).
 * @property {Date|string} [errorAt] - When the error ocurred (if any).
 * @property {string} state - Current subscription state. Enum: `NOT_STARTED`, `PENDING`, `ACTIVE`, `ACTIVE_CANCELLED`, `CANCELLED`, `EXPIRED`, `INVALID`, `NOT_ENOUGH_FUNDS`, `FAILED`.
 * @property {string} cancelState - Enum: `OK`, `PENDING`, `FAILED`.
 * @property {Date|string} [startedAt] - When the subscription started (off-chain value).
 * @property {string} [endedAt] - When the subscription ended (off-chain value).
 * @property {Date|string} updatedAt - Timestamp.
 * @property {Date|string} createdAt -  Timestamp.
 * @property {module:common~Plan} plan
 * @property {string} plan.id - Plan ID (nothing more).
 */

/**
 * @typedef {Object} Receipt
 * @property {string} id - ID.
 * @property {string} txHash - Transaction hash.
 * @property {string} action - What happened in this billing cycle.
 * @property {string} [feeRecipient] - Service fee recipient (since this field is available in the blockchain, we also display it here).
 * @property {string} [feeAmount] - Token amount, also available in the blockchain (stored as string).
 * @property {string} [paymentRecipient] - Payment recipient.
 * @property {string} [paymentAmount] - Payment amount (stored as string).
 * @property {string} [nextPayment] - When is the next billing cycle.
 * @property {Date|string} [nextPaymentDate] - nextPayment but as UNIX timestamp (as ms).
 * @property {Date|string} [onChainCreatedAt] -Timestamp of the subscription creation on the blockchain.
 * @property {Error|string} [reason] - If failed, this is the error message.
 * @property {Date|string} createdAt - When was executed.
 */

/**
 * @typedef {Object} SubscriptionManager
 * @property {number|string} networkId - Ethereum network identifier.
 * @property {string} name - Name.
 * @property {string} walletAddress - Where the billed tokens are transferer.
 * @property {string} publisher - Ethereum address of the publisher of this contract (can edit data and plans).
 * @property {Date|string} [deployedAt] - When the contract was deployed.
 * @property {string} [address] - Contract address.
 * @property {string} authorizer - Ethereum address of the manager of this contract.
 * @property {string} [txHash] - Transaction hash when it was deployed.
 * @property {string} state - Enum: `DRAFT`, `PENDING`, `DEPLOYED`, `FAILED`.
 * @property {string} identifier - DAISY_ID.
 * @property {string} [secretKey] - DAISY_SECRET_KEY.
 * @property {Date|string} createdAt - Timestamp.
 * @property {Date|string} updatedAt - Timestamp.
 * @property {module:common~Plan[]} [plans] - Plans related to this manager.
 */

/**
 * @typedef {Object} Invitation
 * @property {string} identifier - Unique identifier.
 * @property {number} maxUsages - Max usages (active and expired subscriptions).
 * @property {boolean} active - Active or not.
 * @property {boolean} automatic - Requires manual approval or not.
 * @property {string} sharePath - Share path.
 * @property {string} shareURL - Share URL.
 * @property {string} callbackURL -
 * @property {Object} callbackExtra -
 * @property {string} redirectURLDefault -
 * @property {Date|string} createdAt -  Timestamp.
 * @property {Date|string} updatedAt - Timestamp.
 * @property {module:common~Plan} plan
 * @property {string} plan.id - Plan ID (nothing more).
 */

/**
 * @typedef {Object} SignResult
 * @property {Object} agreement Object required in the {@link module:private~ServiceSubscriptions#authorize} and {@link module:common~DaisySubscriptions#submit}.
 * @property {string} signature The `agreement` after being signed by the user using Metamask.
 */

/**
 * Create a instance of a Subscription manager based on the contract deployed at the Daisy Dashboard.
 * @extends module:common~Client
 */
class DaisySubscriptions extends ClientSDK {
  /**
   * If this class is instantiated with only {@link module:common~SubscriptionManager#identifier}
   * this call is necessary to fetch the subscription's manager data.
   * @async
   * @returns {this} - Return self instance.
   *
   * @example
   *
   * const daisy = new DaisySDK.Subscriptions({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   * await daisy.sync() // required
   *
   * @example
   *
   * // `sync` is done behind the scenes with `await DaisySDK.initSubscriptions`.
   * const daisy = await DaisySDK.initSubscriptions({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   *
   */
  sync() {
    return this.request({
      method: "get",
      url: "/",
    }).then(({ data: body }) => {
      this.manager = {
        ...this.manager,
        ...body["data"],
        identifier: this.manager["identifier"],
        secretKey: this.manager["secretKey"],
      };
      return this;
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
      throw new TypeError("Missing argument.");
    }
    const transactionHash = receipt["transactionHash"] || receipt;

    const emitter = new ResumeEventEmitter(this.web3, transactionHash);
    emitter.start();
    return emitter;
  }

  /**
   * @param {module:common~Plan|Object} plan - Plan object.
   * @returns {module:common.DaisySubscriptionsOnToken} Wrapped currency.
   *
   * @example
   *
   * const daisy = new DaisySDK.Subscriptions({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   *
   * daisy.with(plan);
   */
  with(plan) {
    const currency = super.loadToken(plan); // `null` if ETH

    return new DaisySubscriptionsOnToken({
      manager: this.manager,
      override: this.override,
      withGlobals: this.withGlobals,
      currency,
    });
  }

  /**
   * Calling prepareToken(token) is going to be deprecated in favor of daisy.with(payable)
   * @deprecated
   */
  prepareToken(token) {
    console.warn(
      `Calling prepareToken(token) is going to be deprecated in favor of daisy.with(payable)`
    );

    return new DaisySubscriptionsOnToken({
      manager: this.manager,
      override: this.override,
      withGlobals: this.withGlobals,
      currency: token,
    });
  }

  /**
   * Get Subscription Manager data and plans.
   * @async
   * @returns {Promise<SubscriptionManager>} - Subscription Manager and Plans given the manager in the constructor.
   *
   * @example
   *
   * const instance = new DaisySubscriptions({
   *   manager: { identifier: process.env.DAISY_ID },
   * });
   * const { plans, ...manager } = await instance.getData();
   */
  getData() {
    return this.request({
      method: "get",
      url: "/",
    }).then(({ data: body }) => body.data);
  }

  /**
   * @deprecated Renamed to {@link module:common~DaisySubscriptions#getData}.
   */
  getPlans() {
    console.warn(
      "daisy-sdk: Method `getPlans` is deprecated in favor of `getData()`"
    );
    return this.getData();
  }

  /**
   * Get subscriptions.
   * @async
   * @param {Object} filter - Filtering criteria.
   * @param {string|string[]} filter.account - Filter by Ethereum address.
   * @param {string|string[]} filter.state - Filter by subscription state: `NOT_STARTED`, `PENDING`, `ACTIVE`, `ACTIVE_CANCELLED`, `CANCELLED`, `EXPIRED`, `INVALID`, `NOT_ENOUGH_FUNDS`, `FAILED`.
   * @param {string|string[]} filter.token - Filter by token Ethereum address.
   * @param {string|string[]} filter.planId - Filter by {@link module:common~Plan#id}}.
   * @returns {Promise<Subscription[]>} - Subscriptions based on the filtering criteria (if any).
   *
   * @example
   *
   * const instance = new DaisySubscriptions({
   *   manager: { identifier: process.env.DAISY_ID },
   * });
   * const subscriptions = await instance.getSubscriptions({ account: "0x0..." });
   * const subscriptionsActive = await instance.getSubscriptions({
   *   account: "0x0...",
   *   state: ["ACTIVE", "ACTIVE_CANCELLED"],
   * });
   */
  getSubscriptions(filter = {}) {
    return this.request({
      method: "get",
      url: "/subscriptions/",
      query: filter,
    }).then(({ data: body }) => body.data);
  }

  /**
   * Get single subscription.
   * @async
   * @param {Object} [findBy] - Filtering criteria, only one field is needed.
   * @param {string} [findBy.daisyId] - Find Subscription based on a Daisy ID.
   * @param {string} [findBy.onChainId] - Find Subscription based on a `onChainId` in the blockchain.
   * @returns {Promise<?Subscription>} - Subscription found or null;
   *
   * @example
   *
   * const instance = new DaisySubscriptions({
   *   manager: { identifier: process.env.DAISY_ID },
   * });
   * const subscription = await instance.getSubscription({ daisyId: "" });
   */
  getSubscription({ daisyId, onChainId }) {
    if (daisyId) {
      return this.request({
        method: "get",
        url: `/subscriptions/${daisyId}/`,
      }).then(({ data: body }) => body.data);
    } else if (onChainId) {
      return this.request({
        method: "get",
        url: `/subscriptions/hash/${onChainId}/`,
      }).then(({ data: body }) => body.data);
    } else {
      throw new TypeError("Missing arguments");
    }
  }

  /**
   * Get receipts from single subscription.
   * @async
   * @param {Object} [findBy] - Filtering criteria, only one field is needed.
   * @param {string} [findBy.daisyId] - Find Subscription based on a Daisy ID.
   * @param {string} [findBy.onChainId] - Find Subscription based on a `onChainId` in the blockchain.
   * @returns {Promise<Receipt[]>} - Receipts.
   *
   * @example
   *
   * const instance = new DaisySubscriptions({
   *   manager: { identifier: process.env.DAISY_ID },
   * });
   * const receipts = await instance.getReceipts({ daisyId: "" });
   */
  getReceipts({ daisyId, onChainId }) {
    if (daisyId) {
      return this.request({
        method: "get",
        url: `/subscriptions/${daisyId}/receipts/`,
      }).then(({ data: body }) => body.data);
    } else if (onChainId) {
      return this.request({
        method: "get",
        url: `/subscriptions/hash/${onChainId}/receipts/`,
      }).then(({ data: body }) => body.data);
    } else {
      throw new TypeError("Missing arguments");
    }
  }

  /**
   * Create single subscription.
   * @async
   * @param {Object} input - Input arguments
   * @param {Object} input.agreement - The `agreement` is the return of {@link module:browser.DaisySDKToken#sign}.
   * @param {Object} [input.receipt] - Optional. The receipt is the return of {@link module:browser.DaisySDKToken#approve}.
   * @param {string} input.signature - The signature is the return of {@link module:browser.DaisySDKToken#sign}.
   * @returns {Promise<Subscription>} - Created {@link module:common~Subscription}, its {@link module:common~Subscription#state} will be `PENDING`.
   *
   * @example
   *
   * const daisy = await DaisySDK.initSubscriptions({
   *   manager: { identifier: "margarita" },
   *   withGlobals: { web3 },
   * });
   *
   * const { plans } = await daisy.getData();
   * const plan = plans.find(p => ...);
   *
   * const { signature, agreement } = await daisy
   *   .with(plan)
   *   .sign({ account, plan });
   *
   * const subscription = await daisy.submit({ signature, agreement });
   */
  submit({ agreement, receipt, signature }) {
    return this.request({
      method: "post",
      url: "/subscriptions/",
      data: {
        agreement,
        receipt,
        signature,
      },
    }).then(({ data: body }) => {
      return body;
    });
  }

  /**
   * Submit signature and agreement from the beneficiary user to cancel a subscription.
   * @async
   * @param {Object} input - Input arguments
   * @param {Object} input.agreement - The `agreement` is the return of {@link module:browser.DaisySDKToken#signCancel}.
   * @param {string} input.signature - The signature is the return of {@link module:browser.DaisySDKToken#signCancel}.
   * @returns {Promise<Subscription>} - Pending for cancellation {@link module:common~Subscription} object.
   *
   * @example
   *
   * const daisy = await DaisySDK.initSubscriptions({
   *   manager: { identifier: "margarita" },
   *   withGlobals: { web3 },
   * });
   *
   * const plans = await daisy.getPlans();
   * const plan = plans.find(p => ...);
   *
   * const { signature, agreement } = await daisy
   *   .with(plan)
   *   .signCancel({ account, onChainId: subscription["onChainId"] });
   *
   * const subscription = await daisy.submitCancel({ signature, agreement });
   */
  submitCancel({ agreement, signature }) {
    return this.request({
      method: "post",
      url: "/subscriptions/cancel/",
      data: { agreement, signature },
    }).then(({ data: body }) => {
      return body;
    });
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
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:common~DaisySubscriptions#submit}.
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
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:common~DaisySubscriptions#submit}.
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
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:common~DaisySubscriptions#submit}.
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
 * DaisySDK class related to operations over tokens. This should NOT be instantiated directly.
 * Use {@link module:browser~DaisySubscriptions#prepareToken} to get an instance of this class.
 * @extends module:common~DaisySubscriptions
 * @example
 *
 * import DaisySDK from "@daisypayments/daisy-sdk/browser";
 *
 * const web3 = ...; // we recommend getting `web3` from [react-metamask](https://github.com/consensys/react-metamask)
 * const daisy = await DaisySDK.initSubscriptions({
 *   manager: { identifier: ... }, withGlobals: { web3 },
 * });
 *
 * console.log(daisy.with(plan) instanceof DaisySubscriptionsOnToken);
 * // > true
 */
class DaisySubscriptionsOnToken extends DaisySubscriptions {
  /**
   * @private
   */
  constructor({ manager, currency, override, withGlobals }) {
    super({ manager, override, withGlobals });
    this.currency = currency;
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
   * const amount = "15000000000000000000"; // 15 * 10^18 (remember tokens has 18 "decimals" by default).
   *
   * daisy
   *   .with(plan)
   *   .approve(amount, { from: account })
   *   .on("transactionHash", transactionHash => {})
   *   .on("confirmation", (confirmationNumber, receipt) => {})
   *   .on("receipt", receipt => {})
   *   .on("error", error => {});
   */
  approve(amount, sendArgs) {
    if (!sendArgs || !sendArgs.from) {
      throw new TypeError("Missing `sendArgs.from` argument");
    }
    return this.currency.methods["approve"](
      this.manager["address"],
      amount
    ).send(sendArgs);
  }

  /**
   * Check allowance that spender has given to subscription manager
   * @param {Object} account - User account Ethereum address.
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. Promise resolves to string representing how much of the ERC20 token the tokenOwner has approved the subscription manager to spend.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/consensys/react-metamask)
   *
   * daisy
   *   .with(plan)
   *   .allowance(account)
   */
  allowance(account) {
    if (!account) {
      throw new TypeError(
        `allowance() was called without a "owner" specified. Be sure to call allowance() like: daisy.with(payable).allowance(account)`
      );
    }
    if (!this.manager["address"]) {
      throw new Error(
        `You are attempting to check how many tokens the subscription product "${
          this.manager["name"]
        }" is allowed to spend on behalf of ${account}, but the address of "${
          this.manager["name"]
        }" is null. Are you sure that this subscription product is deployed?`
      );
    }

    if (isObject(account)) {
      console.warn(
        `Asking for allowance using allowance({ tokenOwner: account }) is going to be deprecated. Please update to: daisy.allowance(account)`
      );
      // eslint-disable-next-line no-param-reassign
      account = account["tokenOwner"];
    }

    return this.currency.methods["allowance"](
      account,
      this.manager["address"]
    ).call();
  }

  /**
   * Check balance of spender. Useful to prevent subscriber from submitting a signed agreement if they do not have sufficient funds.
   * @async
   * @param {Object} account - User account Ethereum address.
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. Promise resolves to string representing account's balance of ERC20 token.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/consensys/react-metamask)
   *
   * const balance = await daisy
   *   .with(plan)
   *   .balanceOf(account)
   */
  balanceOf(account) {
    return super.balanceOf(account, this.currency);
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
   * @returns {Promise<module:browser~SignResult>} This result is going to be used in {@link module:private~ServiceSubscriptions#authorize} and/or in {@link module:common~DaisySubscriptions#submit}.
   *
   * @example
   *
   * const daisy = await DaisySDK.initSubscriptions({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   * const { signature, agreement } = await daisy.with(plan).sign({
   *   account,
   *   plan,
   * });
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
      throw new TypeError(`Missing required arguments.`);
    }

    const expiration = getExpirationInSeconds(signatureExpiresAt);

    // Subscription object
    const agreement = {
      subscription: {
        subscriber: account,
        token: this.currency.options.address,
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

module.exports = DaisySubscriptions;
