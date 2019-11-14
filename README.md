# Daisy SDK

## Install

> You may also require some extra dependencies like `web3`, and `eventemitter3`

```nocode
yarn add @daisypayments/daisy-sdk eventemitter3 web3@1.0.0-beta.37
```

## MetaMask helper

To help you handle web3 instances and the current account we recommended [daisypayments/react-metamask](https://github.com/Consensys/react-metamask).

## Usage: Subscriptions

### 1. Standard private and public plans with DaisySDK

This is the default flow with standardized plans. This requires the implementation of a front-end with integration of Daisy Widget or Daisy SDK (advanced).

#### 1.1 Create a Subscription Product and Plans

After deploying a Subscription Product to the blockchain go to the *API Integration* tab and grab the `DAISY_ID` and `DAISY_SECRET_KEY`.

```txt
# Example values
DAISY_ID=margarita
DAISY_SECRET_KEY=key
DAISY_CALLBACK_PUBLIC_KEY=key
```

#### 1.2 Integration in the server

Create an instance of `ServerSubscriptions` from the `@daisypayments/daisy-sdk/private` sub-module.
It is extremely important to keep `DAISY_SECRET_KEY` **private**.

```js
const { ServerSubscriptions } = require("@daisypayments/daisy-sdk/private");
const fetch = require("node-fetch");

ServerSubscriptions.fetch = fetch;
const subscriptions = new ServerSubscriptions({
  manager: {
    identifier: process.env.DAISY_ID,
    secretKey: process.env.DAISY_SECRET_KEY,
  },
  withGlobals: { fetch },
});
```

> Server instances requires an instance of `fetch`. We recommend [node-fetch](https://www.npmjs.com/package/node-fetch).

Create and endpoint to retrieve information from your servers back to the frontend.
Here is an example using Express.js:

```js
const express = require("express");
const h = require("express-async-handler");

const app = express();

// GET /api/plans/ -> Fetch plans from the frontend
app.get("/api/plans/", h(async (req, res) => {
  const { plans } = await subscriptions.getData();
  res.json({ plans });
}));

// POST /api/plan/:pid/subscriptions/ -> Submit a subscription to Daisy
app.post("/api/plan/:pid/subscriptions/", h(async (req, res) => {
  const user = req.session;
  const { agreement, signature } = req.body;

  const { plans } = await subscriptions.getData();
  const plan = plans.find(p => p["id"] === req.params["pid"]);
  if (!plan) {
    throw new Error("Plan not found");
  }

  const { data: subscription } = await subscriptions.submit({
    agreement,
    authSignature,
    signature,
  });

  // Save and associate DaisyID from `subscription["daisyId"]` to an user.
  const daisyId = subscription["daisyId"];
  await user.patch({ daisyId });

  res.send("ok");
}));
```

##### 1.2.1 Get plans from the frontend (not recommended)

This will only expose `private: false` plans.

```js
import DaisySDK from "@daisypayments/daisy-sdk";

const daisy = await DaisySDK.initSubscriptions({
  manager: { identifier: "margarita" },
  withGlobals: { web3 },
});

const { plans } = await daisy.getData();
```

#### 1.3 Approving tokens

It is required to approve tokens before signing the subscription agreement.

```js
const daisy = await DaisySDK.initSubscriptions({
  manager: { identifier: "margarita" },
  withGlobals: { web3 },
});

const token = daisy.loadToken(); // web3.js contract instance

const approvalAmount = "9000000000000000";
const account = "0x..." // from MetaMask.

const eventemitter = daisy
  .prepareToken(token)
  .approve(approvalAmount, { from: account });

const eventemitter
  .on("transactionHash", handleApprove_transactionHash)
  .on("confirmation", handleApprove_confirmation)
  .on("receipt", handleApprove_receipt)
  .on("error", handleApprove_error);

function handleApprove_transactionHash(transactionHash) {
  // ...
};
function handleApprove_confirmation(confirmationNumber, receipt) {
  // ...
};
function handleApprove_receipt(receipt) {
  // Here you can assume this task is complete.
  // If you want to resume this transaction, save the `receipt` object.
};
function handleApprove_error(error) {
  // ...
};
```

#### 1.4 Signing subscription agreement

```js
const daisy = await DaisySDK.initSubscriptions({
  manager: { identifier: "margarita" },
  withGlobals: { web3 },
});

const token = daisy.loadToken(); // web3.js contract instance

const { signature, agreement } = await daisy
  .prepareToken(token)
  .sign({ account, plan });

// Send `signature` and `agreement` back to the server
// TODO: replace `:pid` with Plan ID.
const response = await fetch("/api/plan/:pid/subscriptions/", {
  method: "post",
  credentials: "same-origin",
  body: JSON.stringify({ signature, agreement }),
});

const data = await response.json();
```

##### 1.4.1 Submit subscription from the frontend (only for public plans) (not recommended)

```js
const { data: subscription } = await daisy.submit({
  agreement,
  signature,
});
```

#### 1.5 Verify Daisy subscription state

Verify subscription state with:

```js
const sub = await subscriptions.getSubscription({
  id: daisyID,
});
console.log(sub["state"]);

const subs = await subscriptions.getSubscriptions({
  account: "0x...",
});
```

### 2. Invitations

Daisy Invitation allows client to externalize the flow to Daisy's domain.

#### 2.1 Recommended usage: WebHooks

Let's say you created a Daisy Invitation with the following:

```txt
identifier: "/i/af4cff8c"
callbackURL: https://myapp.com/api/callback/daisy-invitation/
callbackExtra: {}

```

This route (`callbackURL`) must handle a HTTP POST request and return a `2XX` status code.

```ts
// TypeScript typing

type ID = string;

/**
 * JSON Payload attached to the POST request to `callbackURL`
 */
interface WebhookFromInvitation {
  /**
   * Semver string
   * Current version: 1.0.0
   */
  version: string;
  subscription: {
    /**
     * DaisyID
     */
    daisyId: ID;
  };
  plan: {
    id: ID;
    private: boolean;
  };
  invitation: {
    id: ID;
    automatic: boolean;
  };
  agreement: CreateSubscriptionAgreement;
  /**
   * When pre-signed (maybe because automatic was set to `true`) this field contains the authorizer signature.
   * To void a pre-signed subscription, return `{ authSignature: null }` from the webhook.
   */
  authSignature: string | null;
  extra: any;
  /**
   * Use SDK to verify this signature.
   */
  digest: string;
}

interface CreateSubscriptionAgreement {
  subscription: SubscriptionAgreement;
  /**
   * Ignore. this is for future compatibility
   */
  previousSubscriptionId: string;
  /**
   * Ignore. this is for future compatibility
   */
  credits: string;
  nonce: string;
  signatureExpiresAt: string;
};

interface SubscriptionAgreement {
  /**
   * Ethereum address (subscriber)
   */
  subscriber: string;
  /**
   * Ethereum address (ERC20 Token)
   */
  token: string;
  price: string;
  /**
   * DAY | MONTH | YEAR
   */
  periodUnit: string;
  /**
   * Number as string (blockchain stuff)
   */
  periods: string;
  maxExecutions: string; // 0 = infinite
  /**
   * Plan's onChainId
   */
  plan: string;
}
```

So a normal server should handle this POST request like:

```js
const express = require("express");
const h = require("express-async-handler");

const app = express();

// POST /api/callback/daisy-invitation/ -> Daisy callback handler
app.post("/api/callback/daisy-invitation/", h(async (req, res) => {
  const { subscription, plan, authSignature } = req.body

  // TODO: Identify the user
  await user.patch({ daisyID: subscription["daisyId"] });

  // Optional redirect URL, may have custom tokens.
  // Is not guaranteed the user is going to enter this URL.
  const redirectURL = "https://myapp.com/checkount/finish/";

  res.json({ authSignature, redirectURL })
}));
```

#### 2.2 Voiding a subscription

To void a subscription and prevent the blockchain transaction set `authSignature` to `null`.

```js
// POST /api/callback/daisy-invitation/ -> Daisy callback handler
app.post("/api/callback/daisy-invitation/", h(async (req, res) => {
  const { subscription, plan, authSignature } = req.body

  /* Void logic */

  res.json({ authSignature: null });
}));
```

> An alternative way of voiding is to return any response with a 400 or 500 HTTP status code.

#### 2.3 Identifying the user

One way to identify an user after getting the callback is by knowing before-hand the user's Ethereum address.
So it can be queried from `req.body["agreement"]["subscriber"]`

A better way is setting the `callbackExtra` payload to something we can recognize in the backend.
Example:

```language
identifier: "/i/af4cff8c"
callbackURL: https://myapp.com/api/callback/daisy-invitation/
callbackExtra: { "email": "user@daisypayments.com" }
```

```js
// POST /api/callback/daisy-invitation/ -> Daisy callback handler
app.post("/api/callback/daisy-invitation/", h(async (req, res) => {
  const { subscription, plan, extra } = req.body

  // TODO: Identify the user
  await user.findById({ email: extra["email"] }).patch({ daisyId: subscription["daisyId"] });

  // ...

  const redirectURL = `https://myapp.com/checkount/finish/?user=${user.id}`;

  res.json({ authSignature, redirectURL })
}
```

#### 2.4 Verify authenticity

To tell if the webhook POST actually came from Daisy servers you can verify its signature:

```js
const { verify } = require("@daisypayments/daisy-sdk/private/webhooks");
const dedent = require("dedent");

// POST /api/callback/daisy-invitation/ -> Daisy callback handler
app.post("/api/callback/daisy-invitation/", h(async (req, res) => {
  const { digest, ...payload } = req.body

  const isAuthentic = verify({
    message: payload,
    digest: digest,
    publicKey: dedent`
      -----BEGIN PUBLIC KEY-----
      MYIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyUaW5FK4ogS2/j7e7h65
      u73/1QrdfocqHB14123kMQO6Z2CR1+dqa9afty3DQ+mLJ7gupOjvYFYrsiIQoMVc
      J3zsmlYNjAnoHe8Kn2nU+Gjq+mJ6mscRIC6uMIMm/LslsiMugeL1YlpYXZ0uwbnY
      TDKiC+g08iGc3tNiaFVCrzNcTH3221vasd321vh21UkWPcAJFDSR+YTtrXjpLMAB
      jm3Vij8IarAmoCmTMIlUPbCb3j6NMjP4r0hulFUx6/u0DFvQPfKwzKnOph0CoX8u
      kde74DGOsKxinYycP20w73aypC9eLY7M3PKtJCft3EypTEvgZRHG5Wd2BaTOvzF4
      tQIDAGAB
      -----END PUBLIC KEY-----
    `,
  });

  if (!isAuthentic) {
    // ...
    res.json({ authSignature: null });
  }

  // ...
});
```

## Usage: Payments invoices

### 1. Creating invoices with Daisy SDK

#### 1.1 Create an Invitation

The first step is going to the Daisy Dashboard and setup an Invitation product. After setting this go to the API Integration and grab the `DAISY_ID` and `DAISY_SECRET_KEY`.

```txt
# Example values
DAISY_OTP_ID=plantae
DAISY_OTP_SECRET_KEY=key
```

#### 1.2 Server integration

Create an instance of `ServerPayments` from the `@daisypayments/daisy-sdk/private` sub-module.
It is extremely important to keep `DAISY_OTP_SECRET_KEY` **private**.

```js
const DaisySDK = require("@daisypayments/daisy-sdk/private");
const fetch = require("node-fetch");

const payments = new DaisySDK.ServerPayments({
  manager: {
    identifier: process.env.DAISY_OTP_ID,
    secretKey: process.env.DAISY_OTP_SECRET_KEY,
  },
  withGlobals: { fetch },
});
```

> Server instances requires an instance of `fetch`. We recommend [node-fetch](https://www.npmjs.com/package/node-fetch).

Let's say we want to sell an access pass for 20 USD or equivalent in DAI.

```js
const express = require("express");
const h = require("express-async-handler");

const app = express();

app.get("/api/checkout/invoice/", h(async (req, res) => {
  const user = req.session;

  // Create an invoice using Daisy SDK
  const invoice = await payments.createInvoice({
    invoicedPrice: 20, // required
    invoicedEmail: user.email, // optional
    invoicedName: user.name, // optional
    invoicedDetail: "Paid Access", // optional
  });

  // Save and associate invoice to user
  await user.update({ invoiceId: invoice["id"]} );

  // Use this object in the frontend to start the transaction.
  res.json({ invoice });
});
```

The `invoice` object looks like this using TypeScript notation:

```ts
interface PaymentInvoice {
  id: string;
  identifier: string;
  state: PaymentInvoiceState;
  amountPaid: string | BigNumber;
  paidAt?: string;
  address: string;
  tokenAddress: string;
  walletAddress: string;
  invoicedPrice: string;
  invoicedEmail?: string;
  invoicedName?: string;
  invoicedDetail?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export enum PaymentInvoiceState {
  Pending = "PENDING",
  UnderPaid = "UNDER_PAID",
  Paid = "PAID",
  OverPaid = "OVER_PAID",
}
```

Since any transaction sending money to the invoice address can fulfill the requested amount, one way to know the state of the payment is to ask Daisy via polling.

```js
app.get("/api/checkout/state/", h(async (req, res) => {
  const user = req.session;

  try {
    const invoice = await payments.getInvoice({
      identifier: user.invoiceId,
    });
    const success = ["PAID", "OVER_PAID"].includes(invoice["state"]);

    res.json({ invoice });
  } catch (error) {
    //
  }
});
```

To get the receipts from any Invoice:

```js
const receipts = await payments.getReceipts({
  identifier: user.invoiceId,
});
```

Receipt object shape:

```ts
interface PaymentReceipt {
  id: string;
  txHash: string;
  account: string;
  amount: string | BigNumber;
  onChainCreatedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}
```
