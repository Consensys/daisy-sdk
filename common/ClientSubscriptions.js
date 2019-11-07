/** @module common */

const Client = require("./Client");

/**
 * @typedef {Object} Plan - Daisy's Plan object. Can be retrieved using {@link module:common~ClientSubscriptions#getData}.
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
 * @property {string} tokenAddress - ERC20 Token address.
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
 * Create a instance of a Subscription manager based on the contract deployed at the Daisy Dashboard.
 * The important data here is the `DAISY_ID`.
 * @extends module:common~Client
 */
class ClientSubscriptions extends Client {
  constructor(manager, override, withGlobals = {}) {
    const { identifier, secretKey } = manager;
    const config = {
      auth: {
        username: identifier,
        password: secretKey,
      },
      ...override,
    };
    super(config, withGlobals);
  }

  /**
   * Get Subscription Manager data and plans.
   * @async
   * @returns {Promise<SubscriptionManager>} - Subscription Manager and Plans given the manager in the constructor.
   *
   * @example
   *
   * const subscriptionProduct = new ClientSubscriptions({
   *   identifier: process.env.DAISY_ID,
   * });
   * const { plans, ...manager } = await subscriptionProduct.getData();
   */
  getData() {
    return this.request({
      method: "get",
      url: "/",
    }).then(({ data: body }) => body.data);
  }

  /**
   * @deprecated Renamed to {@link module:common~ClientSubscriptions#getData}.
   */
  getPlans() {
    // TODO: add deprecation warning.
    return this.getData();
  }

  /**
   * Get subscriptions.
   * @async
   * @param {Object} filter - Filtering criteria.
   * @param {string|string[]} filter.account - Filter by Ethereum address.
   * @param {string|string[]} filter.state - Filter by subscription state: `NOT_STARTED`, `PENDING`, `ACTIVE`, `ACTIVE_CANCELLED`, `CANCELLED`, `EXPIRED`, `INVALID`, `NOT_ENOUGH_FUNDS`, `FAILED`.
   * @param {string|string[]} filter.token - Filter by token Ethereum address.
   * @param {string|string[]} filter.planId - Filter by token Ethereum address.
   * @returns {Promise<Subscription[]>} - Subscriptions based on the filtering criteria.
   *
   * @example
   *
   * const subscriptionProduct = new ClientSubscriptions({
   *   identifier: process.env.DAISY_ID,
   * });
   * const subscriptions = await subscriptionProduct.getSubscriptions({ account: "0x0..." });
   * const subscriptionsActive = await subscriptionProduct.getSubscriptions({
   *   account: "0x0...",
   *   state: ["ACTIVE", "ACTIVE_CANCELLED"],
   * });
   */
  getSubscriptions(filter = {}) {
    return this.request({
      method: "get",
      url: "/subscriptions/",
      data: filter,
    }).then(({ data: body }) => body.data);
  }

  /**
   * Get single subscription.
   * @async
   * @param {Object} criteria - Filtering criteria, only one field is required.
   * @param {string} criteria.daisyId - Find Subscription based on a Daisy ID.
   * @param {string} criteria.onChainId - Find Subscription based on a `onChainId` in the blockchain.
   * @returns {Promise<?Subscription>} - Subscription found.
   *
   * @example
   *
   * const subscriptionProduct = new ClientSubscriptions({
   *   identifier: process.env.DAISY_ID,
   * });
   * const subscription = await subscriptionProduct.getSubscription({ id: "" });
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
      throw new Error("Missing arguments");
    }
  }

  /**
   * Get receipts from single subscription.
   * @async
   * @param {Object} criteria - Filtering criteria, only one field is required.
   * @param {string} criteria.daisyId - Find Subscription based on a Daisy ID.
   * @param {string} criteria.onChainId - Find Subscription based on a `onChainId` in the blockchain.
   * @returns {Promise<Receipt[]>} - Receipts.
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
      throw new Error("Missing arguments");
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
   * const subscriptionProduct = new ClientSubscriptions({
   *   identifier: process.env.DAISY_ID,
   * });
   * const subscription = await subscriptionProduct.submit({ });
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
}

ClientSubscriptions.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = ClientSubscriptions;