# daisy-sdk

## Install

```sh
yarn add @tokenfoundry/daisy-sdk
```

## Usage

### Client-side

```js
import DaisySDK from "@tokenfoundry/daisy-sdk/browser";

const daisy = new DaisySDK(web3); // web3 (from MetaMask)
const token = daisy.loadToken("DAI");

const amount = 100;
const account = "0x0..." // User address (from MetaMask)

daisy
  .prepareToken(token)
  .approve(amount, { from: account })
  .on("transactionHash", blockHash => {})
  .on("confirmation", (confirmationNumber, receipt) => {})
  .on("receipt", receipt => {})
  .on("error", error => {});

const signature = await daisy
  .prepareToken(token)
  .sign({ account, plan: this.props.plan });
```

#### MetaMask helper

The `web3` and `account` variables can be retrieve from MetaMask. We created a helper for this.

```js
// metamask.js
import { createMetaMaskContext } from "@tokenfoundry/metamask-context";

const MetaMaskContext = createMetaMaskContext();
export default MetaMaskContext;

// App.js
import React, { Component } from "react";

import MetaMaskContext from "./metamask";

export default class App extends Component {
  handleButtonClick = (web3, account) => {
    /// use DaisySDK here
  }

  render() {
    <MetaMaskContext.Provider immediate>
      <MetaMaskContext.Consumer>
        {({ web3, accounts, error, awaiting, openMetaMask }) => (
          <div>
            {/* MetaMask allowed and with an active account */}
            {!error && web3 && accounts.length && (
              <button
                onClick={() => this.handleButtonClick(web3, accounts[0])}
              >
                <code>{accounts[0].slice(0, 16)}</code> 🦊
              </button>
            )}

            {/* MetaMask allowed without account */}
            {!error && web3 && accounts.length === 0 && (
              <span>No Wallet 🦊</span>
            )}

            {/* Loading */}
            {!error && !web3 && !awaiting && (
              <a href="#" onClick={openMetaMask}>
                MetaMask loading...
              </a>
            )}

            {/* Force open MetaMask */}
            {!error && !web3 && !awaiting && (
              <a href="#" onClick={openMetaMask}>
                Please open and allow MetaMask
              </a>
            )}

            {/* MetaMask not installed */}
            {error && error.notInstalled && (
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install MetaMask
              </a>
            )}

            {/* MetaMask unhandled error */}
            {error && !error.notInstalled && (
              <a href="#" onClick={openMetaMask}>
                {error.message}
              </a>
            )}
          </div>
        )}
      </MetaMaskContext.Consumer>
    </MetaMaskContext.Provider>
  }
}
```

### Server-side

> Keep the API Key private

```js
const express = require("express");
const { ServiceSubscriptions } = require("@tokenfoundry/daisy-sdk");

const serviceSubscriptions = new ServiceSubscriptions({
  identifier: "margarita",
  secretKey: process.env.SUBSCRIPTION_SECRET || "key",
});

const app = express()

app.get("/api/plans/", async (req, res) => {
  const plans = await subscriptionService.getPlans();
  res.json(plans);
});

app.post("/api/subscriptions/", async (req, res) => {
  const { signature, account } = req.body;

  const plan = plans.find(p => ...);

  const subscription = await subscriptionService.submit({
    plan: plan, // the plan the user is subscribing should match with the signature
    account: account, // from web3 in the frontend
    token: "DAI",
    // startDate: 0, // optional values (default: 0)
    // expires: 0, // optional values (default: 0)
    signature: signature, // from DaisySDK in the frontend
  });

  // TODO: SAVE `subscription` TO LOCAL DB

  res.json(subscription);
});

app.listen(3000);
```
