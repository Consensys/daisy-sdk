/** @module common */

const Client = require("./Client");

class ClientPayments extends Client {
  static init(manager, override, withGlobals) {
    const { identifier, secretKey } = manager;
    const config = {
      auth: {
        username: identifier,
        password: secretKey,
      },
      ...override,
    };
    return new ClientPayments(config, withGlobals);
  }

  getData() {
    return this.request({
      method: "get",
      url: "/payments/",
    }).then(({ data: body }) => body.data);
  }

  /**
   * @async
   */
  getInvoices() {}

  /**
   * @async
   */
  getInvoice() {}

  /**
   * @async
   */
  getReceipts() {}

  /**
   * @async
   */
  createInvoice() {}
}

ClientPayments.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = ClientPayments;
