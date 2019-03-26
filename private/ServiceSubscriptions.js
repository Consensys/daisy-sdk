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
    const { data } = await this.request({
      method: "get",
      url: "/plans/",
    });
    return data;
  }

  async submit({
    plan,
    account,
    token,
    startDate = 0,
    expires = 0,
    signature,
  }) {
    const { data } = await this.request({
      method: "post",
      url: "/subscriptions/",
      data: {
        planId: plan.id || plan,
        account,
        token,
        startDate,
        expires,
        signature,
      },
    });
    return data;
  }
}

module.exports = ServiceSubscriptions;
