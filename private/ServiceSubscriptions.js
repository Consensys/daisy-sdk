const Client = require("./Client");

class ServiceSubscriptions extends Client {
  constructor(opts) {
    const { identifier, secretKey } = opts;
    super({
      ...Client.DEFAULT_CONFIG,
      // TODO: safer url compose
      baseURL: `${Client.DEFAULT_CONFIG.baseURL}`,
      auth: {
        username: identifier,
        password: secretKey,
      },
    });
  }

  async getPlans() {
    const { data: body } = await this.request({
      method: "get",
      url: "/plans/",
    });

    return body.data;
  }

  async submit({
    plan,
    account,
    startDate = "0",
    maxExecutions = "0",
    nonce,
    receipt,
    signature,
  }) {
    const { data: body } = await this.request({
      method: "post",
      url: "/subscriptions/",
      data: {
        planId: plan["id"] || plan,
        account,
        startDate,
        maxExecutions,
        nonce,
        receipt,
        signature,
      },
    });
    return body;
  }
}

module.exports = ServiceSubscriptions;
