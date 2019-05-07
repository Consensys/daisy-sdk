# daisy-sdk

## Install

> You may also require some extra dependencies like `axios`, `web3`, `eventemitter3`, and `querystring`.

```sh
yarn add daisy-sdk
```

## Usage

### Client-side

```js
import DaisySDK from "daisy-sdk/browser";

const manager = ... // from server-side SDK

const daisy = new DaisySDK(manager, web3); // web3 (from MetaMask)

const token = daisy.loadToken();
const amount = 100;
const account = "0x0..." // User address (from MetaMask)

daisy
  .prepareToken(token)
  .approve(amount, { from: account })
  .on("transactionHash", transactionHash => {})
  .on("confirmation", (confirmationNumber, receipt) => {})
  .on("receipt", receipt => {})
  .on("error", error => {});

const { signature, agreement } = await daisy
  .prepareToken(token)
  .sign({ account, plan: this.props.plan });

// SEND signature, agreement to server.
```

#### MetaMask helper

The `web3` and `account` variables can be retrieve from MetaMask. We created a helper for this.

```js
// metamask.js
import { createMetaMaskContext } from "@tokenfoundry/metamask-context";

const MetaMaskContext = createMetaMaskContext();
export default MetaMaskContext;
```

```js
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
                <code>{accounts[0]}</code> 🦊
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
const { ServiceSubscriptions } = require("daisy-sdk");

const serviceSubscriptions = new ServiceSubscriptions({
  identifier: "margarita",
  secretKey: process.env.SUBSCRIPTION_SECRET || "key",
});

const app = express()

app.get("/api/plans/", async (req, res) => {
  const { plans } = await subscriptionService.getData();
  res.json(plans);
});

app.post("/api/subscriptions/", async (req, res) => {
  const { signature, agreement } = req.body;

  const { plans } = await subscriptionService.getData();
  const plan = plans.find(p => ...);

  const authSignature = plan["private"] && await subscriptionService.authorize({
      privateKey: Buffer.from("PRIVATE_KEY", "hex")
    }, agreement);
  
  const subscription = await subscriptionService.submit({
    signature,
    agreement,
  });

  // TODO: SAVE `subscription` TO LOCAL DB

  res.json(subscription).status(201);
});

app.listen(3000);
```
