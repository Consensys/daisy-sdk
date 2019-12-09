/** @module private */

const ClientPayments = require("../common/ClientPayments");

class ServerPayments extends ClientPayments {
  constructor({ manager, override, withGlobals }) {
    super(manager, override, withGlobals);
    this.manager = manager;
    this.override = override;
  }

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

  createInvoice(params = {}) {
    if (!params || !params.invoicedPrice) {
      throw new TypeError(`Missing params.invoicedPrice argument.`);
    }

    // TODO: maybe add check if user forgot to add the decimals to the price.

    const data = {
      invoicedPrice: params.invoicedPrice, // required
      invoicedEmail: params.invoicedEmail,
      invoicedName: params.invoicedName,
      invoicedDetail: params.invoicedDetail,
      tokenAddress: params.tokenAddress,
      walletAddress: params.walletAddress,
    };

    return this.request({
      method: "post",
      url: `/otp/`,
      data,
    }).then(({ data: body }) => body.data);
  }
}

module.exports = ServerPayments;
