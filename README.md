# forge-sdk

## Install

```sh
yarn add @tokenfoundry/forge-sdk
```

## Usage

### Client-side

```js
import ForgeSDK from "@tokenfoundry/forge-sdk/browser";

const forge = new ForgeSDK(web3); // web3 (from MetaMask)
const token = forge.loadToken("DAI");

const amount = 100;
const address = "0x0..." // User address (from MetaMask)

forge
  .prepareToken(token)
  .approve(amount, { from: address })
  .on("transactionHash", blockHash => {})
  .on("confirmation", (confirmationNumber, receipt) => {})
  .on("receipt", receipt => {})
  .on("error", error => {});
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
    /// use ForgeSDK here
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
const { ServiceSubscriptions } = require("@tokenfoundry/forge-sdk");

const serviceSubscriptions = new ServiceSubscriptions({
  name: "margarita",
  secretKey: process.env.SUBSCRIPTION_SECRET || "key",
});

const { data: plans } = await subscriptionService.getPlans();
```
