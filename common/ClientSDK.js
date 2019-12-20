/** @module common */

const Client = require("./Client");
const { isBrowser, isEther } = require("./helpers");
const ERC20 = require("../contracts/lite/ERC20.json");

/**
 * Create a instance of a Payments manager based on the entity at the Daisy Dashboard.
 * @extends module:common~Client
 */
class ClientSDK extends Client {
  get web3() {
    if (this.withGlobals.web3) {
      return this.withGlobals.web3;
    } else if (isBrowser()) {
      return window.web3;
    } else {
      throw new Error("Web3 not present.");
    }
  }

  constructor({ manager, override, withGlobals }) {
    if (!manager) {
      throw new TypeError(
        "daisy-sdk: Missing `manager` first argument when constructing."
      );
    } else if (!manager.identifier) {
      console.warn(
        "daisy-sdk: Missing `manager.identifier` field when constructing."
      );
    }

    const { identifier, secretKey } = manager;
    const config = {
      auth: {
        username: identifier,
        password: secretKey,
      },
      ...override,
    };
    super(config, withGlobals);
    this.manager = manager;
    this.override = override;
  }

  loadToken(payable) {
    if (!payable) {
      throw new TypeError("Payable resource argument missing.");
    } else if (!payable["tokenAddress"]) {
      throw new TypeError(
        "Payable resource argument has missing `tokenAddress` property."
      );
    }

    if (isEther(payable["tokenAddress"])) {
      return null;
    }
    return new this.web3.eth.Contract(ERC20["abi"], payable["tokenAddress"]);
  }

  /**
   * Check balance of spender.
   * @async
   * @param {string} account - User account Ethereum address.
   * @param {Object} [currency=null] - Token instance or null for ETH balance.
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. Promise resolves to string representing account's balance of ERC20 token.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/consensys/react-metamask)
   * const token = daisy.loadToken(invoice); // web3 contract instance.
   *
   * const balance = await daisy
   *   .balanceOf(account)
   */
  balanceOf(account, currency = null) {
    if (!account) {
      throw new TypeError(`balanceOf() was called without an account specified. Be sure to call balanceOf() like:
      
      daisy
        .balanceOf(account, currency)
      `);
    }
    if (currency) {
      return currency.methods["balanceOf"](account).call();
    }
    return this.web3.eth.getBalance(account);
  }
}

module.exports = ClientSDK;
