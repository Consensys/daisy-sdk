const querystring = require("querystring");

const Client = require("./Client");

class SubscriptionProductClient extends Client {
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

  async getSubscriptions({ account }) {
    const filter = { account };
    const { data: body } = await this.request({
      method: "get",
      url: `/subscriptions/?${querystring.stringify(filter)}`,
    });
    return body.data;
  }

  async getSubscription({ id, subscriptionHash }) {
    if (id) {
      const { data: body } = await this.request({
        method: "get",
        url: `/subscriptions/${id}/`,
      });
      return body.data;
    } else if (subscriptionHash) {
      const { data: body } = await this.request({
        method: "get",
        url: `/subscriptions/hash/${subscriptionHash}/`,
      });
      return body.data;
    } else {
      throw new Error("Missing arguments");
    }
  }

  async submit({ agreement, receipt, signature, authSignature }) {
    const { plans } = await this.getPlans();
    const plan = plans.find(p => p["onChainId"] === agreement["plan"]);
    if (!plan) {
      throw new Error("Plan not found");
    }

    const { data: body } = await this.request({
      method: "post",
      url: "/subscriptions/",
      data: {
        agreement,
        receipt,
        authSignature,
        signature,
      },
    });
    return body;
  }
}

module.exports = SubscriptionProductClient;
