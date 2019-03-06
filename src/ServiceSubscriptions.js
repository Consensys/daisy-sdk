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

  async createNewSubscription({ plan }) {
    const { data } = await this.request({
      method: "post",
      url: "/subscriptions/",
      data: {
        planId: plan.id || plan,
      },
    });
    return data;
  }
}

module.exports = ServiceSubscriptions;
