const SubscriptionProductClient = require("./SubscriptionProductClient");

describe("SubscriptionProductClient", () => {
  function createInstance(
    credentials = { identifier: "margarita", secretKey: "key" }
  ) {
    const SDK_DEV = {
      // baseURL: "http://localhost:8000",
    };
    return new SubscriptionProductClient(credentials, SDK_DEV);
  }

  test("Get plans", async () => {
    const subscriptionService = createInstance();

    const data = await subscriptionService.getData();
    const { plans } = data;

    expect(plans).toBeInstanceOf(Array);
    expect(plans).not.toHaveLength(0);
    for (const plan of plans) {
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name");
      expect(plan).toHaveProperty("period");
      expect(plan).toHaveProperty("price");
    }
  });

  test("Get and filter subscriptions", async () => {
    const subscriptionService = createInstance();

    // from ganache-fast
    const ADDRESS = "0x98aDCa769FC6C7628d087dAf69E332Ed27804775";

    const subs = await subscriptionService.getSubscriptions({
      account: ADDRESS,
    });

    expect(subs).toBeInstanceOf(Array);
    expect(subs).not.toHaveLength(0);
    for (const sub of subs) {
      expect(sub).toHaveProperty("account", ADDRESS);
    }

    const sample = subs[0];
    const matches = [
      await subscriptionService.getSubscription(sample),
      await subscriptionService.getSubscription({ daisyId: sample["daisyId"] }),
      await subscriptionService.getSubscription({
        subscriptionHash: sample["subscriptionHash"],
      }),
    ];
    for (const match of matches) {
      expect(match).toEqual(sample);
    }
  });
});
