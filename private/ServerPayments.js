/** @module private */

const DaisyPayments = require("../common/DaisyPayments");

class ServerPayments extends DaisyPayments {
  createInvoice(params = {}) {
    if (!params) {
      throw new TypeError(`Missing params argument.`);
    }

    // TODO: maybe add check if user forgot to add the decimals to the price.

    // Convert numbers and BigNumbers to strings.
    function stringify(something) {
      // eslint-disable-next-line lodash/prefer-is-nil
      return something !== undefined && something !== null
        ? String(something)
        : undefined;
    }

    const data = {
      ...params,
      invoicedPrice: stringify(params.invoicedPrice),
      items: params.items
        ? params.items.map(item => ({
            ...item,
            amount: stringify(item.amount),
          }))
        : undefined,
    };

    return this.request({
      method: "post",
      url: `/otp/`,
      data,
    }).then(({ data: body }) => body.data);
  }
}

module.exports = ServerPayments;
