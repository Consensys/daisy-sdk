/** @module common */

const ClientSDK = require("./ClientSDK");
const { isEther } = require("./helpers");

/**
 * @typedef {Object} PaymentGroup - Payment's manager object.
 * @property {string} identifier - API identifier key.
 * @property {string} secretKey - API identifier key for private and authenticated use.
 * @property {string} name - Display name.
 * @property {BigNumber|string} price - DEPRECATED
 * @property {number} networkId - Ethereum network id (1 is mainnet).
 * @property {boolean} active - Accepting creating new invoices.
 * @property {Date|string} createdAt - Timestamp.
 * @property {Date|string} updatedAt - Timestamp.
 */

/**
 * @typedef {Object} PaymentInvoice
 * @property {string} id - Daisy ID.
 * @property {string} identifier - Another key used to reference the invoice.
 * @property {string} state - Enum: PENDING, UNDER_PAID, PAID, OVER_PAID.
 * @property {string} [paymentState] - State about the transfer to the funds to the `walletAddress`.
 * @property {BigNumber|string} amountPaid - BigNumber. How much was paid (can be 0 or more than `invoicedPrice`).
 * @property {Date|string} [paidAt] - Timestamp related to `paymentState`.
 * @property {string} address - Unique address per invoice.
 * @property {string} tokenAddress - ERC20 token address.
 * @property {string} walletAddress - Beneficiary address.
 * @property {BigNumber|string} invoicedPrice - BigNumber. How much is asked to pay.
 * @property {string} [invoicedEmail] - For notifications.
 * @property {string} [invoicedName] - Display name.
 * @property {string} [invoicedDetail] - Display optional descriptions.
 * @property {Date|string} createdAt - Timestamp.
 * @property {Date|string} updatedAt - Timestamp.
 */

/**
 * @typedef {Object} PaymentReceipt
 * @property {string} id - Daisy ID.
 * @property {string} txHash - Transaction hash. Depends on {@link PaymentGroup#networkId}.
 * @property {string} account - Payer.
 * @property {BigNumber|string} amount - How much was paid in this single invoice.
 * @property {Date|string} onChainCreatedAt - Timestamp. Creation on blockchain.
 * @property {Date|string} createdAt - Timestamp.
 * @property {Date|string} updatedAt - Timestamp.
 */

/**
 * Create a instance of a Payments manager based on the entity at the Daisy Dashboard.
 * @extends module:common~Client
 */
class ClientPayments extends ClientSDK {
  /**
   * If this class is instantiated with only {@link module:common~PaymentGroup#identifier}
   * this call is necessary to fetch the payment group's manager data.
   * @async
   * @returns {this} - Return self instance.
   *
   * @example
   *
   * const daisy = new DaisySDK.Payments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   * await daisy.sync() // may be required
   *
   * @example
   *
   * // `sync` is done behind the scenes with `await DaisySDK.initPayments`.
   * const daisy = await DaisySDK.initPayments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   */
  sync() {
    return this.request({
      method: "get",
      url: "/otp/",
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
   * Load token's web3 contract as {@link external:"web3.eth.Contract"}.
   * @param {module:common~PaymentInvoice|Object} invoice - Invoice object.
   * @param {Object} invoice.tokenAddress - Required token address.
   * @returns {module:browser.DaisyPaymentsOnToken} Wrapped token.
   *
   * @example
   *
   * const daisy = new DaisySDK.Payments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   *
   * const token = daisy.with(invoice); // the token is taken from the invoice object.
   */
  with(invoice) {
    const currency = super.loadToken(invoice); // `null` if ETH

    return new DaisyPaymentsOnToken({
      manager: this.manager,
      override: this.override,
      withGlobals: this.withGlobals,
      currency,
    });
  }

  /**
   * Get Payment manager (PaymentGroup) data.
   * @async
   * @returns {Promise<PaymentGroup>} - PaymentGroup given the manager in the constructor.
   *
   * @example
   *
   * const client = new ClientPayments({
   *   manager: { identifier: process.env.DAISY_OTP_ID },
   * });
   * const group = await subscriptionProduct.getData();
   */
  getData() {
    return this.request({
      method: "get",
      url: "/otp/",
    }).then(({ data: body }) => body.data);
  }

  /**
   * Get invoices from the Payment Group.
   * @async
   * @param {Object} filter - Filtering criteria.
   * @param {string} filter.state - Filter by invoice state: `PENDING`, `UNDER_PAID`, `PAID`, `OVER_PAID`.
   * @returns {Promise<PaymentInvoice[]>} - Invoices based on the filtering criteria (if any).
   *
   * @example
   *
   * const client = new ClientPayments({
   *   manager: { identifier: process.env.DAISY_OTP_ID },
   * });
   * const invoices = await client.getInvoices({ state: "PAID" });
   */
  getInvoices(filter = {}) {
    return this.request({
      method: "get",
      url: "/otp/invoices/",
      query: filter,
    }).then(({ data: body }) => body.data);
  }

  /**
   * Get single invoice.
   * @async
   * @param {Object} [findBy] - Filtering criteria, only one field is needed.
   * @param {string} [findBy.identifier] - Find Invoice based on the identifier (share URL).
   * @param {string} [findBy.address] - Find Invoice based on its `address` since it is unique per invoice.
   * @returns {Promise<?PaymentInvoice>} - PaymentInvoice found or null;
   *
   * @example
   *
   * const client = new ClientPayments({
   *   manager: { identifier: process.env.DAISY_OTP_ID },
   * });
   * const invoice = await client.getInvoice({ address: "" });
   */
  getInvoice({ identifier, address }) {
    if (identifier) {
      return this.request({
        method: "get",
        url: `/otp/invoices/${identifier}/`,
      }).then(({ data: body }) => body.data);
    } else if (address) {
      return this.request({
        method: "get",
        url: `/otp/invoices/address/${address}/`,
      }).then(({ data: body }) => body.data);
    } else {
      throw new TypeError("Missing arguments");
    }
  }

  /**
   * Get receipts from invoice.
   * @async
   * @param {Object} [findBy] - Filtering criteria, only one field is needed.
   * @param {string} [findBy.identifier] - Find Invoice based on the identifier (share URL).
   * @param {string} [findBy.address] - Find Invoice based on its `address` since it is unique per invoice.
   * @returns {Promise<PaymentReceipt[]>} - Payment receipts;
   *
   * @example
   *
   * const client = new ClientPayments({
   *   manager: { identifier: process.env.DAISY_OTP_ID },
   * });
   * const receipts = await client.getReceipts({ address: "" });
   */
  getReceipts({ identifier, address }) {
    if (identifier) {
      return this.request({
        method: "get",
        url: `/otp/invoices/${identifier}/receipts/`,
      }).then(({ data: body }) => body.data);
    } else if (address) {
      return this.request({
        method: "get",
        url: `/otp/invoices/address/${address}/receipts/`,
      }).then(({ data: body }) => body.data);
    } else {
      throw new TypeError("Missing arguments");
    }
  }
}

/**
 * DaisySDK class related to operations over tokens. This should NOT be instantiated directly.
 * Use {@link module:browser~ClientPayments#prepareToken} to get an instance of this class.
 *
 * @extends module:common~ClientPayments
 *
 * @example
 *
 * import DaisySDK from "@daisypayments/daisy-sdk/browser";
 *
 * const web3 = ...; // we recommend getting `web3` from [react-metamask](https://github.com/consensys/react-metamask)
 * const daisy = await DaisySDK.initPayments({
 *   manager: { identifier: ... }, withGlobals: { web3 },
 * });
 *
 * console.log(daisy.prepareToken(daisy.loadToken(invoice)) instanceof DaisyPaymentsOnToken);
 * // > true
 */
class DaisyPaymentsOnToken extends ClientPayments {
  /**
   * @private
   */
  constructor({ manager, currency, override, withGlobals }) {
    super({ manager, override, withGlobals });
    this.currency = currency;
  }

  balanceOf(account) {
    return super.balanceOf(account, this.currency);
  }

  /**
   * Transfer token to an address "predicted" by create2.
   * @async
   * @param {module:common~PaymentInvoice|Object} invoice - Input object
   * @param {string|number} invoice.invoicedPrice - Amount to pay/transfer. See: {@link module:common~PaymentInvoice#invoicedPrice}.
   * @param {string} invoice.address - Beneficiary of the transfer. See: {@link module:common~PaymentInvoice#address}.
   * @param {Object} sendArgs - Web3 arguments for transactions. Must have `from` field. @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#methods-mymethod-send|web3js.readthedocs}
   * @param {string} sendArgs.from - User account Ethereum address (payer).
   * @returns {external:PromiEvent} It's a transaction result object.
   *
   * @example
   *
   * const daisy = await DaisySDK.initPayments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   * const token = daisy.loadToken(invoice);
   * const { transactionHash } = await daisy
   *   .prepareToken(token)
   *   .pay(invoice, { from: account });
   */
  pay(invoice, sendArgs) {
    if (!invoice) {
      throw new TypeError("Missing `invoice` argument.");
    } else if (!sendArgs || !sendArgs.from) {
      throw new TypeError("Missing `sendArgs.from` argument");
    }

    const value = invoice["invoicedPrice"];
    const to = invoice["address"];

    if (isEther(this.currency)) {
      return this.web3.eth.sendTransaction({ ...sendArgs, to, value });
    }
    return this.currency.methods["transfer"](to, value).send(sendArgs);
  }

  /**
   * Get blockchain's transfers. Useful to check the state of a processing transaction.
   * @async
   * @param {module:common~PaymentInvoice|Object} invoice - Input object
   * @param {string} invoice.address - Beneficiary of the transfer. See: {@link module:common~PaymentInvoice#address}.
   * @param {Object} [opts={}]
   * @param {number|string} [opts.fromBlock=0]
   * @param {string} [opts.toBlock="latest"]
   * @returns {external:PromiEvent} Web3 events as an array.
   */
  getTransfers(invoice, opts = { fromBlock: 0, toBlock: "latest" }) {
    if (!invoice) {
      throw new TypeError("Missing `invoice` argument.");
    }
    const address = invoice["address"];
    return this.currency.getPastEvents("Transfer", {
      filter: { to: [address] },
      ...opts,
    });
  }
}

module.exports = ClientPayments;
