/** @module private */

const ClientPayments = require("../common/ClientPayments");

class ServerPayments extends ClientPayments {
  constructor({ manager, override, withGlobals }) {
    super(manager, override, withGlobals);
    this.manager = manager;
    this.override = override;
  }

  createInvoice(params = {}) {
    const data = {
      invoicedPrice: params.invoicedPrice,
      invoicedEmail: params.invoicedEmail,
      invoicedName: params.invoicedName,
      invoicedDetail: params.invoicedDetail,
    };

    return this.request({
      method: "post",
      url: `/otp/`,
      data,
    }).then(({ data: body }) => body.data);
  }
}

module.exports = ServerPayments;
