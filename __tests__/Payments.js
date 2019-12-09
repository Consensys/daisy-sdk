const fetch = require("node-fetch"); // eslint-disable-line no-shadow
const BigNumber = require("bignumber.js");

const { SAI, INVALID } = require("./utils");

const ServerPayments = require("../private/ServerPayments");
const { ZERO_ADDRESS } = require("../common/helpers");

describe("Payments", () => {
  const PAYMENT_GROUPS = [
    {
      name: "Uncategorized",
      networkId: 1,
      identifier: "uncategorized-661-7ea58516d971a8de",
      secretKey:
        "ab11da49bd8ad3a05b7c5d2fc6ea8c7184e9a88199bdd123ac947fe053b3b137",
    },
    {
      name: "pay-rinkeby",
      networkId: 4,
      identifier: "pay-rinkeby-337-a1ea35d14123f3b9",
      secretKey:
        "2db04817ed4d0fcbd25908b42a5bf5f32438c6f980d9102af258a3caf5f81b6e",
    },
  ];

  const SDK_DEV = {
    baseURL:
      process.env.OVERRIDE_BASEURL || "https://sdk.staging.daisypayments.com/",
  };

  function createInstance(group, opts = { secretKey: true }) {
    return new ServerPayments({
      manager: {
        ...group,
        secretKey: opts.secretKey ? group.secretKey : null,
      },
      override: SDK_DEV,
      withGlobals: { fetch },
    });
  }

  test("Should fail with mixed credentials", async () => {
    const [A, B] = PAYMENT_GROUPS;

    const experiment = createInstance({
      identifier: A.identifier,
      secretKey: B.secretKey,
    });
    await expect(experiment.getData()).rejects.toThrow(
      "OTP for credentials not found."
    );
  });

  test("Should fails if missing `identifier` key", () => {
    const [A] = PAYMENT_GROUPS;

    expect(() =>
      createInstance({
        identifier: null,
        secretKey: A.secretKey,
      })
    ).toThrow(TypeError);
  });

  describe("On group without default values (Uncategorized)", () => {
    const me = createInstance(PAYMENT_GROUPS[0]);

    // test("Should warn if addresses are missing on instantiating", async () => {
    //   const me = createInstance(PAYMENT_GROUPS[0]);
    //   await me.sync();
    // });

    test("Should throw if tokenAddress is missing on createInvoice", async () => {
      await expect(me.createInvoice({ invoicedPrice: 100 })).rejects.toThrow(
        "Could not create Invoice. Please go to https://app.daisypayments.com and set a default token for new invoices."
      );
    });

    test("Should throw if walletAddress is missing on createInvoice", async () => {
      await expect(
        me.createInvoice({ invoicedPrice: 100, tokenAddress: SAI })
      ).rejects.toThrow(
        "Could not create Invoice. Please go to https://app.daisypayments.com and set a default wallet for new invoices."
      );
    });

    test("Should throw if invalid addresses", async () => {
      await expect(
        me.createInvoice({
          invoicedPrice: 100,
          tokenAddress: INVALID,
          walletAddress: ZERO_ADDRESS,
        })
      ).rejects.toThrow("Token not found");

      await expect(
        me.createInvoice({
          invoicedPrice: 100,
          tokenAddress: SAI,
          walletAddress: INVALID,
        })
      ).rejects.toThrow("Invalid Ethereum address");
    });
  });

  describe("SDK usage of HTTP methods", () => {
    const manager = PAYMENT_GROUPS[1];
    const me = createInstance(manager);
    const other = createInstance(PAYMENT_GROUPS[0]);

    test("Sync and have consistency with `getData()`", async () => {
      const data = await me.getData();
      expect(data).toHaveProperty("networkId", 4); // Rinkeby
      expect(data).toHaveProperty("tokenAddress");
      expect(data).toHaveProperty("walletAddress");

      await me.sync();
      expect(me.manager).toHaveProperty("tokenAddress", data["tokenAddress"]);
      expect(me.manager).toHaveProperty("walletAddress", data["walletAddress"]);
    });

    test("Create and get invoice", async () => {
      const { tokenAddress, walletAddress } = await me.getData();

      const invoice = await me.createInvoice({
        invoicedPrice: 100,
      });
      expect(invoice).toHaveProperty("identifier");
      expect(invoice).toHaveProperty("address");
      expect(invoice).toHaveProperty("state", "PENDING");
      expect(invoice).toHaveProperty("invoicedPrice", "100"); // returned as string
      expect(invoice).toHaveProperty("tokenAddress", tokenAddress);
      expect(invoice).toHaveProperty("walletAddress", walletAddress);

      const invoices = await me.getInvoices();
      expect(invoices).toBeInstanceOf(Array);
      expect(invoices).not.toHaveLength(0);
      expect(invoices).toContainObject(invoice);

      const byAddress = await me.getInvoice({ address: invoice["address"] });
      const byIdentifier = await me.getInvoice({
        identifier: invoice["identifier"],
      });
      expect(byAddress).toEqual(invoice);
      expect(byIdentifier).toEqual(invoice);

      const receipts = await me.getReceipts(invoice);
      expect(receipts).toBeInstanceOf(Array);

      await expect(other.getInvoice(invoice)).rejects.toThrow(
        "Wrong payment service id in credentials"
      );
      await expect(other.getReceipts(invoice)).rejects.toThrow(
        "Wrong payment service id in credentials"
      );
    });

    describe("Support multiple `invoicePrice` types", () => {
      const price = `5${"0".repeat(18)}`; // 5e18 // 5000000000000000000

      test("As String", async () => {
        const invoice = await me.createInvoice({
          invoicedPrice: price,
        });
        expect(invoice).toHaveProperty("invoicedPrice", price);
      });

      // As Number is already tested in the other test cases.

      test("As BigNumber (bignumber.js)", async () => {
        const invoice = await me.createInvoice({
          invoicedPrice: new BigNumber(price),
        });

        expect(invoice).toHaveProperty("invoicedPrice", price);
      });
    });
  });
});
