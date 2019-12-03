/** @module common */

const Client = require("./Client");

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
class ClientPayments extends Client {
  constructor(manager, override, withGlobals = {}) {
    if (!manager) {
      throw new TypeError(
        "daisy-sdk: Missing `manager` first argument when constructing."
      );
    } else if (!manager.identifier) {
      throw new TypeError(
        "daisy-sdk: Missing `manager.identifier` field when constructing."
      );
    }

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
      data: filter,
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

module.exports = ClientPayments;
