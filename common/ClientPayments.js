/** @module common */

const Client = require("./Client");

class ClientPayments extends Client {
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

  getData() {
    return this.request({
      method: "get",
      url: "/otp/",
    }).then(({ data: body }) => body.data);
  }

  /**
   * Get subscriptions.
   * @async
   * @param {Object} filter - Filtering criteria.
   * @param {string} filter.state - Filter by invoice state.
   * @returns {Promise<Invoice[]>} - Invoices
   */
  getInvoices(filter = {}) {
    return this.request({
      method: "get",
      url: "/otp/invoices/",
      data: filter,
    }).then(({ data: body }) => body.data);
  }

  /**
   * @async
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
   * @async
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
