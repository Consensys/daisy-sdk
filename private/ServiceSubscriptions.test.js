const ServiceSubscriptions = require("./ServiceSubscriptions");

describe("ServiceSubscriptions", () => {
  function createInstance(
    credentials = { identifier: "margarita", secretKey: "key" }
  ) {
    return new ServiceSubscriptions(credentials);
  }
  // const subscriptionService = null;

  // beforeEach(() => {});

  test("Get plans and subscribe", async () => {
    const subscriptionService = createInstance();

    const { data: plans } = await subscriptionService.getPlans();

    expect(plans).toBeInstanceOf(Array);
    for (const plan of plans) {
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name");
      expect(plan).toHaveProperty("period");
      expect(plan).toHaveProperty("price");
    }
  });
});
