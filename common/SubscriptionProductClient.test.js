const SubscriptionProductClient = require("./SubscriptionProductClient");

describe("SubscriptionProductClient", () => {
  function createInstance(
    credentials = { identifier: "margarita", secretKey: "key" }
  ) {
    return new SubscriptionProductClient(credentials);
  }

  test("Get plans", async () => {
    const subscriptionService = createInstance();

    const data = await subscriptionService.getData();
    const { plans } = data;

    expect(plans).toBeInstanceOf(Array);
    for (const plan of plans) {
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name");
      expect(plan).toHaveProperty("period");
      expect(plan).toHaveProperty("price");
    }
  });

  test("Get and filter subscriptions", async () => {
    const subscriptionService = createInstance();

    const subs1 = await subscriptionService.getSubscriptions();

    expect(subs1).toBeInstanceOf(Array);

    // from ganache-fast
    const ADDRESS = "0x98aDCa769FC6C7628d087dAf69E332Ed27804775";

    const subs2 = await subscriptionService.getSubscriptions({
      account: ADDRESS,
    });

    expect(subs2).toBeInstanceOf(Array);
    for (const sub of subs2) {
      expect(sub["account"]).toEqual(ADDRESS);
    }
  });
});
