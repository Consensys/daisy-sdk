# Daisy SDK & Docs

## Install

> You may also require some extra dependencies like `axios`, `web3`, `eventemitter3`, and `querystring`.

```sh
yarn add daisy-sdk axios eventemitter3 querystring web3@1.0.0-beta.37
```

## MetaMask helper

To help you handle web3 instances and the current account we recommended [tokenfoundry/react-metamask](https://github.com/tokenfoundry/react-metamask#readme).

## Usage

### 1. Standard private and public plans with DaisySDK

This is the default flow with standardized plans. This requires the implementation of a front-end with integration of Daisy Widget or Daisy SDK (advanced).

#### 1.1 Create a Subscription Product and Plans

After deploying a Subscription Product to the blockchain go to the *API Integration* tab and get the `DAISY_ID` and `DAISY_SECRET_KEY`.

```txt
# Example values
DAISY_ID=margarita
DAISY_SECRET_KEY=key
```

#### 1.2 Integration in the server

Create an instance of `ServiceSubscriptions` from the `daisy-sdk/private` sub-module.
It is extremely important to keep `DAISY_SECRET_KEY` **private**.

```js
const { ServiceSubscriptions } = require("daisy-sdk/private");

const subscriptionService = new ServiceSubscriptions({
  identifier: process.env.DAISY_ID,
  secretKey: process.env.DAISY_SECRET_KEY,
});
```

Create and endpoint to retrieve information from your servers back to the frontend.
Here is an example using Express.js:

```js
const express = require("express");
const h = require("express-async-handler");

const app = express();

// GET /api/plans/ -> Fetch plans from the frontend
app.get("/api/plans/", h(async (req, res) => {
  const { plans } = await subscriptionService.getData();
  res.json({ plans });
}));

// POST /api/plan/:pid/subscriptions/ -> Submit a subscription to Daisy
app.post("/api/plan/:pid/subscriptions/", h(async (req, res) => {
  const user = req.session;
  const { agreement, signature } = req.body;

  const { plans } = await subscriptionService.getData();
  const plan = plans.find(p => p["id"] === req.params["pid"]);
  if (!plan) {
    throw // ...
  }

  let authSignature = null; // not required for public plans.
  if (plan.private) {
    // TODO: Add conditions for `user` to use private plan.

    const authorizer = {
      privateKey: Buffer.from(process.env.PRIVATE_KEYS, "hex"),
    };
    authSignature = await subscriptionService.authorize(
      authorizer,
      agreement,
    );
  }

  const { data: subscription } = await subscriptionService.submit({
    agreement,
    authSignature,
    signature,
  });

  // Save and associate subscription["id"] AKA DaisyID to an user.
  const DaisyID = subscription["id"];
  await user.patch({ DaisyID });

  res.send("ok");
}));
```

##### 1.2.1 Get plans from the frontend (not recommended)

This will only expose `private: false` plans.

```js
import DaisySDK from "daisy-sdk";

const daisy = new DaisySDK({ identifier: "margarita" }, web3)

const { plans } = await daisy.getData();
```

#### 1.3 Approving tokens

It is required to approve tokens before signing the subscription agreement.

```js
const daisy = new DaisySDK({ identifier: "margarita" }, web3)
await daisy.sync();

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
const daisy = new DaisySDK({ identifier: "margarita" }, web3)
await daisy.sync();

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
const subscription = await subscriptionService.getSubscription({
  id: DaisyID,
});
console.log(subscription["state"]);

const subscriptions = await subscriptionService.getSubscriptions({
  account: "0x...",
});
```

### 2. Invitations

Daisy Invitation allows client to externalize the flow to Daisy's domain.

#### 2.1 Recommended usage: WebHooks

Let's say you created a Daisy Invitation with the following id:

```txt
identifier: "/i/af4cff8c"
callbackURL: https://myapp.com/api/callback/daisy-invitation/
callbackExtra: {}

```

Then we need to route `callbackURL` to your server URL (with HTTPS) and a path.
This route must handle a HTTP POST request and return a `2XX` status code.

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
    id: ID;
  };
  plan: {
    id: ID;
    private: boolean;
  };
  invitation: {
    id: ID;
  };
  agreement: SubscriptionAgreement;
  extra: any;
}

// From Daisy SDK `sign` method.
interface SubscriptionAgreement = {
  /**
   * Subscriber Ethereum address
   */
  subscriber: string;
  /**
   * Token address
   */
  token: string;
  amount: string;
  periodUnit: string;
  periods: string;
  maxExecutions: string;
  signatureExpiresAt: string;
  plan: string;
  nonce: string;
}
```

So a normal server should handle this POST request like:

```js
const express = require("express");
const h = require("express-async-handler");

const app = express();

// GET /api/callback/daisy-invitation/ -> Daisy callback handler
app.get("/api/callback/daisy-invitation/", h(async (req, res) => {
  const { subscription, plan } = req.body

  // TODO: Identify the user
  await user.patch({ DaisyID: subscription["id"] });

  let authSignature = null; // not required for public plans.
  if (plan.private) {
    // TODO: Add conditions for user to use private plan.

    const authorizer = {
      privateKey: Buffer.from(process.env.PRIVATE_KEYS, "hex"),
    };
    authSignature = await subscriptionService.authorize(
      authorizer,
      agreement,
    );
  }

  // Optional redirect URL, may have custom tokens.
  // Is not guaranteed the user is going to enter this URL.
  const redirectURL = "https://myapp.com/checkount/finish/";

  res.json({ authSignature, redirectURL })
}));
```

#### 2.2 Identifying the user

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
// GET /api/callback/daisy-invitation/ -> Daisy callback handler
app.get("/api/callback/daisy-invitation/", h(async (req, res) => {
  const { subscription, plan, extra } = req.body

  // TODO: Identify the user
  await user.findById({ email: extra.email }).patch({ DaisyID: subscription["id"] });

  // ...

  const redirectURL = `https://myapp.com/checkount/finish/?user=${user.id}`;

  res.json({ authSignature, redirectURL })
}
```
