/** @module common */

const Client = require("./Client");
const { isObject, isBrowser, isEther } = require("./helpers");
const ERC20 = require("../contracts/lite/ERC20.json");

/**
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
      // eslint-disable-next-line no-console
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

  /**
   * Returns null if the currency is ETH. Now this method is for internal use.
   * @param {Object} payable - Invoice or plan
   * @param {string} payable.tokenAddress - Ethereum address
   * @private
   */
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
   * Check balance of spender. We recommend parsing the return value to a BigNumber.
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
      throw new TypeError(
        `balanceOf() was called without a "owner" specified. Be sure to call balanceOf() like: daisy.with(payable).balanceOf(account)`
      );
    } else if (isObject(account)) {
      // eslint-disable-next-line no-console
      console.warn(
        `Asking for allowance using allowance({ tokenOwner: account }) is going to be deprecated. Please update to: daisy.allowance(account)`
      );
      // eslint-disable-next-line no-param-reassign
      account = account["tokenOwner"];
    }

    if (currency) {
      return currency.methods["balanceOf"](account).call();
    }
    return this.web3.eth.getBalance(account);
  }

  getTokens({ query, orderField, orderDirection }) {
    return this.request({
      methods: "get",
      url: "/otp/tokens",
      query: { query, orderField, orderDirection },
    }).then(({ data: body }) => body.data);
  }

  getTokenBySymbol(symbol) {
    return this.request({
      method: "get",
      url: `/otp/tokens/${symbol}`,
    }).then(({ data: body }) => body.data);
  }
}

module.exports = ClientSDK;
