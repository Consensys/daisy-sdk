const fetch = require("node-fetch"); // eslint-disable-line no-shadow

const { sort, describeEach, DSY } = require("./utils");

const ServerSubscriptions = require("../private/ServerSubscriptions");
const { ZERO_ADDRESS } = require("../common/helpers");

describe("Subscription product/service", () => {
  const SUBSCRIPTION_SERVICES = [
    {
      name: "sub-rinkeby",
      networkId: 4,
      identifier: "sub-rinkeby-741-4bbd5e596933adef",
      secretKey:
        "c6630b1fa507702a30c34da64a5e3884a800d705ee3df2ddff107695c39664c9",
      plans: [
        {
          id: "cGxhbjoyOQ==",
          name: "rinkeby-2-dsy-daily-public",
          tokenAddress: DSY,
        },
        {
          id: "cGxhbjozMA==",
          name: "rinkeby-1-dsy-daily-private",
          tokenAddress: DSY,
          subscriptions: [
            {
              daisyId: "daisy-67910914-96a0-4a0d-8e6d-6a6e033da914",
              account: "0x98aDCa769FC6C7628d087dAf69E332Ed27804775",
            },
          ],
        },
      ],
    },
    {
      name: "sub-rinkeby-2",
      networkId: 4,
      publisherAddress: "",
      walletAddress: "",
      identifier: "sub-rinkeby-2-673-f0474f454a2e38ca",
      secretKey:
        "cea92102d21ecc28a6815532dd805ef0352f7a6080f6adab3ab75d9985424914",
      plans: [
        {
          id: "cGxhbjoyOQ==",
          name: "Untitled",
        },
      ],
    },
  ];

  const SDK_DEV = {
    baseURL:
      process.env.OVERRIDE_BASEURL || "https://sdk.staging.daisypayments.com/",
  };

  function createInstance(subscriptionService, opts = { secretKey: true }) {
    return new ServerSubscriptions({
      manager: {
        ...subscriptionService,
        secretKey: opts.secretKey ? subscriptionService.secretKey : null,
      },
      override: SDK_DEV,
      withGlobals: { fetch },
    });
  }

  test("Should fail with mixed credentials", async () => {
    const [A, B] = SUBSCRIPTION_SERVICES;

    const experiment = createInstance({
      identifier: A.identifier,
      secretKey: B.secretKey,
    });
    await expect(experiment.getData()).rejects.toThrow(
      "Service for credentials not found."
    );
  });

  test("Should fails if missing `identifier` key", () => {
    const [A] = SUBSCRIPTION_SERVICES;

    expect(() =>
      createInstance({
        identifier: null,
        secretKey: A.secretKey,
      })
    ).toThrow(TypeError);
  });

  describe("SDK usage of HTTP methods", () => {
    const me = createInstance(SUBSCRIPTION_SERVICES[0]);
    const other = createInstance(SUBSCRIPTION_SERVICES[1]);

    test("Sync, plans and create invitations", async () => {
      const { plans } = await me.getData();
      const { plans: otherPlans } = await other.getData();

      expect(plans).toBeInstanceOf(Array);
      expect(plans).not.toHaveLength(0);
      expect(sort(plans)).toEqual(sort(SUBSCRIPTION_SERVICES[0].plans));
      for (const plan of plans) {
        expect(plan).toHaveProperty("id");
        expect(plan).toHaveProperty("tokenAddress");
        expect(plan).toHaveProperty("periods");
        expect(plan).toHaveProperty("price");

        const invitation = await me.createInvitation(plan);
        expect(invitation).toHaveProperty("identifier");
        expect(invitation).toHaveProperty("plan.id", plan["id"]);

        // Do not allow create invitation as public SDK usage (no secretKey)
        const asPublic = createInstance(SUBSCRIPTION_SERVICES[0], {
          secretKey: false,
        });
        await expect(asPublic.createInvitation(plan)).rejects.toThrow(
          "Not in an organization."
        );

        // Prevent creating invitations for a subscription is not yours
        for (const otherPlan of otherPlans) {
          await expect(me.createInvitation(otherPlan)).rejects.toThrow(
            "Not in an organization."
          );
        }
      }
    });

    describeEach(SUBSCRIPTION_SERVICES[0].plans, "name")(
      "Actions over plan: %s",
      (name, plan) => {
        describeEach(plan.subscriptions, "daisyId")(
          "Actions over subscription: %s",
          (name, subscription) => {
            const { daisyId, account } = subscription;

            test("Query subscription by DaisyID", async () => {
              const entry = await me.getSubscription({ daisyId });
              expect(entry).toBeTruthy();
              expect(entry).toHaveProperty("daisyId", daisyId);
              expect(entry).toHaveProperty("account", account);
              expect(entry).toHaveProperty("onChainId", expect.anything());
              expect(entry).toHaveProperty("maxExecutions");
              expect(entry).toHaveProperty("nextPayment");
              expect(entry).toHaveProperty("periodUnit");
              expect(entry).toHaveProperty("periods");
              expect(entry).toHaveProperty("signature");
              expect(entry).toHaveProperty("state");
              expect(entry).toHaveProperty("tokenAddress");
            });

            test("Query subscription's receipts", async () => {
              const receipts = await me.getReceipts({ daisyId });
              expect(receipts).toBeInstanceOf(Array);
            });

            test("Query subscriptions by account", async () => {
              const entries = await me.getSubscriptions({ account });
              expect(entries).toBeInstanceOf(Array);
              expect(entries).not.toHaveLength(0);

              // Checksum is not enforced.
              const lowercase = await me.getSubscriptions({
                account: account.toLowerCase(),
              });
              expect(lowercase).toBeInstanceOf(Array);
              expect(lowercase).toHaveLength(entries.length);
            });

            test("Query subscriptions with not matches", async () => {
              const empty = await me.getSubscriptions({
                account,
                token: ZERO_ADDRESS,
              });
              expect(empty).toHaveLength(0);
            });

            test("Query subscriptions with inclusion 'in' (array in filter criteria)", async () => {
              const notEmpty = await me.getSubscriptions({
                account,
                token: [ZERO_ADDRESS, plan.tokenAddress],
              });
              expect(notEmpty).not.toHaveLength(0);
            });

            test("Prevent from querying from other service", async () => {
              await expect(other.getSubscription({ daisyId })).rejects.toThrow(
                "Forbidden"
              );
              await expect(other.getReceipts({ daisyId })).rejects.toThrow(
                "Forbidden"
              );
              await expect(
                other.getSubscriptions({ account })
              ).resolves.toHaveLength(0);
            });
          }
        );
      }
    );
  });
});
