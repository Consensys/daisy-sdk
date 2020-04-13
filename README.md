![Alt text](/.github/logo.svg)

Daisy's software enables businesses to accept cryptocurrency for purchases, subscriptions, usage fees and other payments. Now that revenue can come from anywhere, manage it in one place.

# Daisy SDK

```js
const fetch = require("node-fetch");

const response = await fetch("https://api.daisypayments.con/graphql", {
  method: "POST",
  body: JSON.stringify({
    query: `
      query($id: ID!) {
        invoice(id: $id) {
          name
        }
      }
    `,
    variables: { id: 1 },
  }),
  headers:{
    "Content-Type": "application/json"
    "Authorization": DAISY_API_KEY,
  }
});
const payload = await response.json();

const errors = payload["errors"] || [];
if (errors.length !== 0) {
  throw new Error(errors[0]["message"]);
}

const invoice = payload["data"]["invoice"];
```

```js
const fetch = require("node-fetch");
const Daisy = require("@daisypayments/daisy");

const daisy = new Daisy(DAISY_API_KEY, { fetch });

try {
  const data = await daisy.graphql({
    query: `
      query($id: ID!) {
        invoice(id: $id) {
          name
        }
      }
    `,
    variables: { id: 1 },
  });
  const invoice = data["invoice"];
} catch (error) {
  if (
    error instanceof Daisy.DaisyGraphQLError &&
    error.extensions.code === "BAD_REQUEST")
  {
    // ...
  } else {
    // ...
  }
}
```



























# Daisy SDK

Daisy SDK is a library for interacting with all aspects of the Daisy product in both a browser and Node environment. This guide will go through using the library to sign up for a new subscription, access a subscription's current state and subscriber data, approve tokens for an existing subscription, and cancel an existing subscription.

It is also possible to create Payment Invoices for one-time purchases.

## Install

Begin by adding the `@daisypayments/daisy-sdk` package to your project:

```sh
# Required dependency with npm
npm install --save @daisypayments/daisy-sdk

# Optional dependencies with npm
npm install --save fetch ethers web3@1.2.6
```

```sh
# Required dependency with yarn
yarn add @daisypayments/daisy-sdk

# Optional dependencies with yarn
yarn add fetch ethers web3@1.2.6
```

---

## Payment Invoices

Start by creating a new Payment Group on [Daisy](https://app.daisypayments.com/):

* Mainnet: The main Ethereum chain where value is real.
* Rinkeby: Test net for development purposes.

![create-new-payment-group](/.github/dashboard-create-pg.png)

Get the API keys from the created instance:

![payment-group-settings](/.github/dashboard-pg-settings.png)

In this case we are going to store them as environment variables. We recommend [`dotenv`](https://github.com/motdotla/dotenv) to manage them.

```txt
# .env
DAISY_OTP_PUBLIC=my-e-commerce-invoices-509-f1215f5742cf07dd
DAISY_OTP_SECRET=af3exxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx96b2
```

### ERC20 Token

To create an invoice for a **ERC20 Token** it is really easy:

```js
const DaisySDK = require("@daisypayments/daisy-sdk/private");
const { parseUnits } = require("ethers/utils/units"); // See: https://docs.ethers.io/ethers.js/html/api-utils.html#ether-strings-and-wei
const { BigNumber } = require("ethers/utils/bignumber"); // See: https://docs.ethers.io/ethers.js/html/api-utils.html#big-numbers
const fetch = require("node-fetch");

require("dotenv").config(); // load environment variables

const payments = new DaisySDK.ServerPayments({
  manager: {
    identifier: process.env.DAISY_OTP_PUBLIC,
    secretKey: process.env.DAISY_OTP_SECRET,
  },
  withGlobals: { fetch },
});

/**
 * Most ERC20 tokens like DAI have 18 decimals.
 * See: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md#decimals
 */
const decimals = 18;

const invoice = await payments.createInvoice({
  tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI address
  walletAddress: "0x98aDCa769FC6C7628d087dAf69E332Ed27804775", // Your wallet address
  invoicedPrice: parseUnits("1299.9", decimals), // 1299.9 USD === 1299900000000000000000 DAI (units)
  invoicedEmail: "example@email.com", // Daisy will send an email to this address
})

const href = invoice["shareURL"];
console.log(href);

```

#### Test token

Since there is no DAI on Rinkeby we have a custom ERC20 Token called `DSY` with address:

```txt
0x6FB3222E6134892a622D3990E3C94D75FF772b18
```

It has *18 decimals* and you can mint it in the settings page of your organization at https://app.daisypayments.com/.

> View it on Etherscan.io: https://rinkeby.etherscan.io/address/0x6FB3222E6134892a622D3990E3C94D75FF772b18

### ETH invoice

To create an invoice for a **Eth** it very similar:

```js
const DaisySDK = require("@daisypayments/daisy-sdk/private");
const { parseEther } = require("ethers/utils/units"); // parseEther is an alias of parseUnits(value, 18)
const { BigNumber } = require("ethers/utils/bignumber"); // See: https://docs.ethers.io/ethers.js/html/api-utils.html#big-numbers
const fetch = require("node-fetch");

require("dotenv").config(); // load environment variables

const payments = new DaisySDK.ServerPayments({
  manager: {
    identifier: process.env.DAISY_OTP_PUBLIC,
    secretKey: process.env.DAISY_OTP_SECRET,
  },
  withGlobals: { fetch },
});

/**
 * Use this address to ask for Eth instead of a token.
 */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const invoice = await payments.createInvoice({
  tokenAddress: ZERO_ADDRESS,
  walletAddress: "0x98aDCa769FC6C7628d087dAf69E332Ed27804775", // Your wallet address
  invoicedPrice: parseEther("0.42"), // 0.42 ETH === 420000000000000000 WEI
  invoicedEmail: "example@email.com", // Daisy will send an email to this address
})

const href = invoice["shareURL"];
console.log(href);
```

Any Link looks like this:

```txt
https://pay.daisypayments.com/i/:identifier
```

Example:

```txt
https://pay.daisypayments.com/i/y-ZV_zI9
```

### Testing ETH

You can use Rinkeby native ETH. Ask for some test ETH here: https://www.rinkeby.io/#faucet

## Line items

It is possible to have a table of line-items and add a breakdown of the final price including tax and shipping costs.

```js
const { parseUnits } = require("ethers/utils/units"); // See: https://docs.ethers.io/ethers.js/html/api-utils.html#ether-strings-and-wei

const decimals = 18; // DAI, ETH and popular tokens

const invoice = await payments.createInvoice({
  tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI address
  walletAddress: "0x98aDCa769FC6C7628d087dAf69E332Ed27804775", // Your wallet address
  invoicedEmail: "example@email.com", // Daisy will send an email to this address
  items: [
    {
      sku: "MM178", // optional
      description: "Professional turntable TT-7700",
      image: { // optional
        URL: "https://source.unsplash.com/300x300/?turntable",
      },
      quantity: 1, // by default is 1
      amount: parseUnits("749.9", decimals),
    },
    {
      description: "Vinyl record",
      quantity: 12,
      amount: parseUnits("15.6", decimals), // price per unit
    },
    {
      type: "TAX", // default type is "SKU" for normal items
      amount: parseUnits("7.33", decimals),
    }
    {
      type: "SHIPPING", // default type is "SKU" for normal items
      amount: parseUnits("4.50", decimals),
    }
  ]
});

const href = invoice["shareURL"];
console.log(href);
```

## Real integration and automation

Do not forget to have a public URL to resolve callback requests on your server. In the current example is `https://tryme.daisypayments.com`. A secure HTTP connection (HTTPS) is required.

```txt
# .env
APP_URL=https://tryme.daisypayments.com
```

### Creating invoices

```js
const express = require("express");
const bodyParser = require("body-parser");
const DaisySDK = require("@daisypayments/daisy-sdk/private");
const { parseEther } = require("ethers/utils/units");
const fetch = require("node-fetch");

require("dotenv").config(); // load environment variables

const { User, Item } = require("./models");

const payments = new DaisySDK.ServerPayments({
  manager: {
    identifier: process.env.DAISY_OTP_PUBLIC,
    secretKey: process.env.DAISY_OTP_SECRET,
  },
  withGlobals: { fetch },
});

const app = express();
app.use(bodyParser.json());

app.post("/checkout/", async (req, res, next) => {
  try {
    const { user, cart } = req.session;

    // Get items from DB (assuming cart is an array of ids)
    const items = await Item.find().where('_id').in(cart).exec();

    // Generate invoice
    const invoice = await payments.createInvoice({
      tokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI address
      walletAddress: "0x98aDCa769FC6C7628d087dAf69E332Ed27804775", // Your wallet address
      invoicedEmail: user.email,
      invoicedName: user.name,
      items: items.map(item => ({
        sku: item._id, // or your own identifier
        description: item.name,
        quantity: 1,
        // Assuming price is in USD (1 USD = 1 DAI)
        amount: parseUnits(String(item.price), decimals),
      })),
      redirectURL: `${process.env.APP_URL}/checkout/success/`, // optional but recommended
      cancelURL: `${process.env.APP_URL}/checkout/`, // optional
    });

    // Save invoice to current user orders. The `address` is unique and serves as an id
    await User
      .update({ _id: user._id }, { $push: { daisyOrders: invoice["address"] } })
      .exec();

    // Redirect the user to Daisy checkout flow
    return res.redirect(invoice["shareURL"]);
  } catch (err) {
    return next(err);
  }
});

app.get("/checkout/success/", (req, res) => {
  // get order from `req.session` or `req.query["invoiceId"]`
  const invoice = await payments.getInvoice({
    address: ...,
  });
  console.log(invoice["state"]); // null: processing or not started | states: UNPAID, UNDER_PAID, PAID, OVER_PAID

  res.render(...);
})

app.get("/checkout/", (req, res) => {
  // retrieve current checkout session and show again the payment options.
});

app.listen(3000, () => {
  console.log("App listening on port 3000");
});
```

> Having troubles testing locally because of `redirectURL` and `cancelURL`?  See [Testing locally](#testing-locally).

### Retrieving invoice status via SDK

```js
// Using invoice address
const updated = await payments.getInvoice({
  address: invoice["address"],
});
```

### Webhooks

It is possible (and recommended) to have real-time updates via webhooks. To enable webhooks go to the "API Integration" tab and scroll down to the "Webhooks settings" section:

![webhooks](/.github/dashboard-pg-webhooks.png)

* Webhook method: select the HTTP method. `POST` is recommended and the standard.
* Webhook URL: you server URL. **HTTPS is enforced**.

> Running a localhost development environment? Use a tunnel like https://ngrok.com/ or https://www.tunnelbear.com/.

Webhook events are JSON payloads you can read from your server. Here is the Webhook schema in Typescript:

```ts
interface WebhookEventSpec {
  /**
   * Webhook unique id
   */
  id: string;
  /**
   * Semver format
   * @see: https://semver.org/
   */
  version: string;
  /**
   * Always uppercase. Use a switch() over this value.
   */
  action: string;
  /**
   * Arbitrary JSON object
   */
  payload: object | undefined | null;
  meta: {
    type: string;
    identifier: string
  };
}
```

The following is an example of how to deal with incoming webhook requests:

```js
app.post("/webhooks-daisy/", async (req, res, next) => {
  try {
    const webhook = req.body;

    switch (webhook["action"]) {
      case "PAYMENT_PAID": {
        const address = webhook["payload"]["address"]; // unique invoice address
        // Mark order as paid.
        return res.status(200); // return any success status code
      }
      default: {
        return next();
      }
    }
  } catch (err) {
    next(err);
  }
});
```

To verify the authenticity of webhook requests you can use the RSA Public key from the dashboard and compare the signature digest from the HTTP Headers:

![alt](/.github/dashboard-pg-rsa.png)

There is a helper function included in DaisySDK package to make verifying easier. Import it from:

```js
const webhooks = require("@daisypayments/daisy-sdk/private/webhooks");
```

Example code:

```js
const webhooks = require("@daisypayments/daisy-sdk/private/webhooks");
const dedent = require("dedent");

app.post("/webhooks-daisy/", async (req, res, next) => {
  try {
    const webhook = req.body;
    const digest = req.get("X-DAISY-SIGNATURE");

    const isAuthentic = webhooks.verify({
      digest,
      message: webhook,
      publicKey: dedent`
        -----BEGIN PUBLIC KEY-----
        MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8Bs4flCwzob2h/sLUFfc
        LyLJbiLnsTKH3S2BD8yswzIAwI4dB44+B3KSl++TE6Yxsa7SxGLI/P6flhb7nAl6
        IPMsWxvspfJ2nUB4wp0UFCGX88LmCEdljKjUl1qq0H8lDf+hrVUq9neOGUg5BBvp
        z6Gxom7Xn03toOO00BOV+UzSsLq8asXrTRa6VPSeufEpAsjdlvtzEUitVR5LvUhW
        f/nIjgBHKqiuN/+Jcn1EaZgonP0BvcLTy4I/dRMdEkNB1TvcbABLWN+6/Y6vysxK
        HAuSO+HAxxaP98wEHwFVuZRtmMZmXsQBVUIp7krSS2P1/ZZpUvThjt3pXQdtLSJq
        CwIDAQAB
        -----END PUBLIC KEY-----
      `,
    });
    if (!isAuthentic) {
      throw new Error("Not valid signature");
    }

    switch (webhook["action"]) {
      case "PAYMENT_PAID": {
        const address = webhook["payload"]["address"];
        // Mark order as paid.
        return res.status(200); // return any success status code
      }
      default: {
        return next();
      }
    }
  } catch (err) {
    next(err);
  }
});
```

#### List of webhooks events

##### `PAYMENT_PAID`

```ts
interface PAYMENT_PAID {
  /**
   * Invoice unique address
   */
  address: string;
}
```

---

## Subscriptions

Create and deploy a Daisy Subscription service:

![daisy-dashboard](/.github/dashboard.png)

After deploying a Subscription Product to the blockchain go to the *API Integration* tab and grab the API from the settings page:

![daisy-dashboard-settings](/.github/dashboard-ss-settings.png)

In this case we are going to store them as environment variables. We recommend [`dotenv`](https://github.com/motdotla/dotenv) to manage them.

```txt
# .env
DAISY_PUBLIC=recurring-payments-730-e511c7d9e5f63ae1
DAISY_SECRET=b121xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4c2f
```

The most basic form of an subscription link is by creating an Invitation from a Plan Id:

```js
const DaisySDK = require("@daisypayments/daisy-sdk/private");
const fetch = require("node-fetch");

require("dotenv").config(); // load environment variables

const subscriptions = new DaisySDK.ServerSubscriptions({
  manager: {
    identifier: process.env.DAISY_PUBLIC,
    secretKey: process.env.DAISY_SECRET,
  },
  withGlobals: { fetch },
});

const planId = "get-the-plan-id-from-daisy-dashboard";

const invitation = await subscriptionService.createInvitation(planId);

const href = invoice["shareURL"];
console.log(href);
```

Any Link looks like this:

```txt
https://pay.daisypayments.com/i/:identifier
```

Example:

```txt
https://pay.daisypayments.com/i/C-xRf08_
```

After a subscription request is completed via Daisy Payment Module it is possible to retrieve the subscription object using the ID from the webhook callback.

```js
const sub = await subscriptions.getSubscription({
  daisyId: daisyId,
});
console.log(sub["state"]);
```

See next section to learn about subscription's webhook calls.

## Real integration and automation

### Webhooks

It is possible (and recommended) to have real-time updates via webhooks. To enable webhooks go to the "API Integration" tab and scroll down to the "Webhooks settings" section:

![webhooks](/.github/dashboard-ss-webhooks.png)

* Webhook method: select the HTTP method. `POST` is recommended and the standard.
* Webhook URL: you server URL. **HTTPS is enforced**.

> Running a localhost development environment? Use a tunnel like https://ngrok.com/ or https://www.tunnelbear.com/.

Webhook events are JSON payloads you can read from your server. Here is the Webhook schema in Typescript:

```ts
interface WebhookEventSpec {
  /**
   * Webhook unique id
   */
  id: string;
  /**
   * Semver format
   * @see: https://semver.org/
   */
  version: string;
  /**
   * Always uppercase. Use a switch() over this value.
   */
  action: string;
  /**
   * Arbitrary JSON object
   */
  payload: object | undefined | null;
  meta: {
    type: string;
    identifier: string
  };
}
```

Create an instance of `ServerSubscriptions` from the `@daisypayments/daisy-sdk/private` sub-module.
It is extremely important to keep `DAISY_SECRET_KEY` **private**.

```js
const express = require("express");
const bodyParser = require("body-parser");
const DaisySDK = require("@daisypayments/daisy-sdk/private");
const { parseEther } = require("ethers/utils/units");
const fetch = require("node-fetch");

require("dotenv").config(); // load environment variables

const { Users } = require("./models");

const subscriptions = new DaisySDK.ServerSubscriptions({
  manager: {
    identifier: process.env.DAISY_PUBLIC,
    secretKey: process.env.DAISY_SECRET,
  },
  withGlobals: { fetch },
});

const app = express();
app.use(bodyParser.json());

app.post("/register/", async (req, res, next) => {
  try {
    const { user, planId } = req.session;

    // Validate if plan id is valid
    // Validate if user is elegible for this plan.

    const invitation = await subscriptionService.createInvitation(planId, {
      webhooksExtra: {
        userId: user._id,
      },
      redirectURL: `${process.env.APP_URL}/register/success/`, // optional but recommended
      cancelURL: `${process.env.APP_URL}/register/`, // optional
    });

    // Redirect the user to Daisy checkout flow
    return res.redirect(invitation["shareURL"]);
  } catch (err) {
    return next(err);
  }
});

app.post("/webhooks-daisy/", async (req, res, next) => {
  try {
    const webhook = req.body;

    switch (webhook["action"]) {
      // Always triggered first
      case "SUBSCRIPTION_REQUESTED": {
        const webhooksExtra = webhook["payload"]["extra"];

        // Associate (pending) subscription to user
        await Users.update({ _id: webhooksExtra["userId"] }, {
          daisySubscription: webhook["payload"]["daisyId"],
        }).exec();

        return res.status(200); // return any success status code
      }
      // Subscription is started
      case "SUBSCRIPTION_ACTIVE": {
        const daisySubscription = webhook["payload"]["daisyId"];

        const user = await User.findOne({ daisySubscription }).exec();
        // ...
        return res.status(200); // return any success status code
      }
      case "SUBSCRIPTION_FAILED": {
        const daisySubscription = webhook["payload"]["daisyId"];

        const user = await User.findOne({ daisySubscription }).exec();
        // ...
        return res.status(200); // return any success status code
      }
      // Subscription is no longer active.
      case "SUBSCRIPTION_ENDED": {
        const daisySubscription = webhook["payload"]["daisyId"];
        const reason = webhook["payload"]["reason"];

        const user = await User.findOne({ daisySubscription }).exec();
        // ...
        return res.status(200); // return any success status code
      }
      default: {
        return next();
      }
    }
  } catch (err) {
    next(err);
  }
});

app.get("/register/success/", (req, res) => {
  // get subscription's id from the updated user from SUBSCRIPTION_REQUESTED webhook call.

  const { user, planId } = req.session;

  const invoice = await subscriptions.getSubscription({
    daisyId: user.daisySubscription,
  });
  console.log(invoice["state"]); // null: processing or not started | states: UNPAID, UNDER_PAID, PAID, OVER_PAID

  res.render(...);
});

app.get("/checkout/", (req, res) => {
  // retrieve current checkout session and show again the payment options.
});

app.listen(3000, () => {
  console.log("App listening on port 3000");
});
```

> Having troubles testing locally because of `redirectURL` and `cancelURL`?  See [Testing locally](#testing-locally).

#### List of webhooks events

##### `SUBSCRIPTION_REQUESTED`

When a subscription is requested and successfully sent to the blockchain transaction pool.
Success is not guaranteed and it could fail for many reasons.
See [`SUBSCRIPTION_FAILED`](#SUBSCRIPTION_FAILED) action for failure while sending to the blockchain.

```ts
interface SUBSCRIPTION_REQUESTED {
  /**
   * Daisy ID
   */
  daisyId: string;

  /**
   * Additional payload when creating an Invitation.
   * See `createInvitation` method with argument `webhooksExtra`.
   */
  extra: any | undefined | null;
}
```

##### `SUBSCRIPTION_FAILED`

Subscription request failed to get into the blockchain.

```ts
interface SUBSCRIPTION_FAILED {
  /**
   * Daisy ID
   */
  daisyId: string;

  /**
   * Additional payload when creating an Invitation.
   * See `createInvitation` method with argument `webhooksExtra`.
   */
  extra: any | undefined | null;
}
```

##### `SUBSCRIPTION_ACTIVE`

Subscription was accepted and active in the blockchain.
The subscription state was set to `ACTIVE` or `ACTIVE_CANCELLED` depending the case and can be queried via API/SDK.

```ts
interface SUBSCRIPTION_ACTIVE {
  /**
   * Daisy ID
   */
  daisyId: string;

  /**
   * Subscription id in the blockchain.
   */
  onChainId: string;
}
```

##### `SUBSCRIPTION_ENDED`

Subscription was accepted and active in the blockchain.
The subscription state was set to `ACTIVE` or `ACTIVE_CANCELLED` depending the case and can be queried via API/SDK.

```ts
interface SUBSCRIPTION_ENDED {
  /**
   * Daisy ID
   */
  daisyId: string;

  /**
   * Subscription id in the blockchain.
   */
  onChainId: string;
}
```

##### `SUBSCRIPTION_CANCELLATION_CONFIRMED`

Subscription was cancelled and on the next billing cycle `SUBSCRIPTION_ENDED` is going to be triggered.

```ts
interface SUBSCRIPTION_CANCELLATION_CONFIRMED {
  /**
   * Daisy ID
   */
  daisyId: string;

  /**
   * Subscription id in the blockchain.
   */
  onChainId: string;
}
```

##### `SUBSCRIPTION_CANCELLATION_FAILED`

Subscription cancellation failed and still active. No action required.

```ts
interface SUBSCRIPTION_CANCELLATION_FAILED {
  /**
   * Daisy ID
   */
  daisyId: string;

  /**
   * Subscription id in the blockchain.
   */
  onChainId: string;
}
```

---

## Testing locally

Having troubles testing locally because of `redirectURL` and `cancelURL`? Try creating a development entry on your `/etc/hosts` file.

```sh
# on macOS
sudo nano /private/etc/hosts

# on linux
sudo nano /etc/hosts
```

Example `hosts` file:

```txt
##
# Host Database
#
# localhost is used to configure the loopback interface
# when the system is booting.  Do not change this entry.
##
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost

# added for daisy <---
0.0.0.0 tryme.daisypayments.com
```

> Remember to remove the entry later.
