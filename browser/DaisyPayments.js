/** @module browser */

import ClientPayments from "../common/ClientPayments";
import { ZERO_ADDRESS } from "../common/helpers";

import ERC20 from "../contracts/lite/ERC20.json";

/**
 * Browser SDK class. This requires a {@link module:common~PaymentGroup} object to be instantiated and a `web3` instance.
 * The `web3` instance may come from [react-metamask](https://github.com/consensys/react-metamask). If not present, it is taken from `window`.
 * @extends module:common~ClientPayments
 */
export default class DaisyPayments extends ClientPayments {
  get web3() {
    return this.withGlobals.web3 || window.web3;
  }

  constructor({ manager, override, withGlobals }) {
    super(manager, override, withGlobals);
    this.manager = manager;
    this.override = override;
  }

  /**
   * If this class is instantiated with only {@link module:common~PaymentGroup#identifier}
   * this call is necessary to fetch the payment group's manager data.
   * @async
   * @returns {this} - Return self instance.
   *
   * @example
   *
   * const daisy = new DaisySDK.Payments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   * await daisy.sync() // may be required
   *
   * @example
   *
   * // `sync` is done behind the scenes with `await DaisySDK.initPayments`.
   * const daisy = await DaisySDK.initPayments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   */
  sync() {
    return this.request({
      method: "get",
      url: "/otp/",
    }).then(({ data: body }) => {
      this.manager = {
        ...this.manager,
        ...body["data"],
        identifier: this.manager["identifier"],
        secretKey: this.manager["secretKey"],
      };

      const validate = address => address && address !== ZERO_ADDRESS;

      if (!validate(this.manager["tokenAddress"])) {
        // eslint-disable-next-line no-console
        console.warn(
          "Please go to https://app.daisypayments.com and set a default token for new invoices."
        );
      } else if (!validate(this.manager["walletAddress"])) {
        // eslint-disable-next-line no-console
        console.warn(
          `Please go to https://app.daisypayments.com and set a default wallet for new invoices.`
        );
      }

      return this;
    });
  }

  /**
   * Check balance of spender.
   * @async
   * @param {Object} sendArgs - Web3 arguments for transactions. Must have `tokenOwner` field. @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#methods-mymethod-send|web3js.readthedocs}
   * @param {string} sendArgs.tokenOwner - User account Ethereum address.
   * @returns {external:PromiEvent} - `web3`'s return value for actions on the Blockchain. Promise resolves to string representing account's balance of ERC20 token.
   *
   * @example
   *
   * const account = ...; // we recommend getting `account` from [react-metamask](https://github.com/consensys/react-metamask)
   * const token = daisy.loadToken(invoice); // web3 contract instance.
   *
   * const balance = await daisy
   *   .prepareToken(token)
   *   .balanceOf({ tokenOwner: account })
   */
  balanceOf(sendArgs) {
    if (!sendArgs || !sendArgs.tokenOwner) {
      throw new TypeError(`balanceOf() was called without a tokenOwner specified. Be sure to call balanceOf() like:
      
      daisy
        .prepareToken(token)
        .balanceOf({ tokenOwner: account })
      
      `);
    }
    return this.token.methods["balanceOf"](sendArgs.tokenOwner).call();
  }

  /**
   * Load token's web3 contract as {@link external:"web3.eth.Contract"}.
   * @param {module:common~PaymentInvoice|Object} invoice - Invoice object.
   * @param {Object} invoice.tokenAddress - Required token address.
   * @returns {external:"web3.eth.Contract"} - Ethereum contract.
   *
   * @example
   *
   * const daisy = new DaisySDK.Payments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   *
   * const token = daisy.loadToken(invoice); // the token is taken from the invoice object.
   */
  loadToken(invoice) {
    if (!invoice) {
      throw new TypeError("Invoice argument missing.");
    } else if (!invoice["tokenAddress"]) {
      throw new TypeError(
        "Invoice argument has missing `tokenAddress` property."
      );
    }
    return new this.web3.eth.Contract(ERC20["abi"], invoice["tokenAddress"]);
  }

  /**
   * Takes an Web3's contract instance and wraps it into a {@link module:browser.DaisyPaymentsOnToken}.
   * @param {external:"web3.eth.Contract"} token - Web3's contract instance from {@link module:browser~DaisyPayments#loadToken}.
   * @returns {module:browser.DaisyPaymentsOnToken} Wrapped token.
   */
  prepareToken(token) {
    return new DaisyPaymentsOnToken({
      manager: this.manager,
      override: this.override,
      withGlobals: this.withGlobals,
      token,
    });
  }
}

/**
 * DaisySDK class related to operations over tokens. This should NOT be instantiated directly.
 * Use {@link module:browser~DaisyPayments#prepareToken} to get an instance of this class.
 *
 * @extends module:common~DaisyPayments
 *
 * @example
 *
 * import DaisySDK from "@daisypayments/daisy-sdk/browser";
 *
 * const web3 = ...; // we recommend getting `web3` from [react-metamask](https://github.com/consensys/react-metamask)
 * const daisy = await DaisySDK.initPayments({
 *   manager: { identifier: ... }, withGlobals: { web3 },
 * });
 *
 * console.log(daisy.prepareToken(daisy.loadToken(invoice)) instanceof DaisyPaymentsOnToken);
 * // > true
 */
export class DaisyPaymentsOnToken extends DaisyPayments {
  /**
   * @private
   */
  constructor({ manager, token, override, withGlobals }) {
    super({ manager, override, withGlobals });
    this.token = token;
  }

  /**
   * Transfer token to an address "predicted" by create2.
   * @async
   * @param {module:common~PaymentInvoice|Object} invoice - Input object
   * @param {string|number} invoice.invoicedPrice - Amount to pay/transfer. See: {@link module:common~PaymentInvoice#invoicedPrice}.
   * @param {string} invoice.address - Beneficiary of the transfer. See: {@link module:common~PaymentInvoice#address}.
   * @param {Object} sendArgs - Web3 arguments for transactions. Must have `from` field. @see {@link https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#methods-mymethod-send|web3js.readthedocs}
   * @param {string} sendArgs.from - User account Ethereum address (payer).
   * @returns {external:PromiEvent} It's a transaction result object.
   *
   * @example
   *
   * const daisy = await DaisySDK.initPayments({
   *   manager: { identifier: ... }, withGlobals: { web3 },
   * });
   * const token = daisy.loadToken(invoice);
   * const { transactionHash } = await daisy
   *   .prepareToken(token)
   *   .pay(invoice, { from: account });
   */
  pay(invoice, sendArgs) {
    if (!invoice) {
      throw new TypeError("Missing `invoice` argument.");
    } else if (!sendArgs || !sendArgs.from) {
      throw new TypeError("Missing `sendArgs.from` argument");
    }

    const price = invoice["invoicedPrice"];
    const address = invoice["address"];
    return this.token.methods["transfer"](address, price).send(sendArgs);
  }

  /**
   * Get blockchain's transfers. Useful to check the state of a processing transaction.
   * @async
   * @param {module:common~PaymentInvoice|Object} invoice - Input object
   * @param {string} invoice.address - Beneficiary of the transfer. See: {@link module:common~PaymentInvoice#address}.
   * @param {Object} [opts={}]
   * @param {number|string} [opts.fromBlock=0]
   * @param {string} [opts.toBlock="latest"]
   * @returns {external:PromiEvent} Web3 events as an array.
   */
  getTransfers(invoice, opts = { fromBlock: 0, toBlock: "latest" }) {
    if (!invoice) {
      throw new TypeError("Missing `invoice` argument.");
    }
    const address = invoice["address"];
    return this.token.getPastEvents("Transfer", {
      filter: { to: [address] },
      ...opts,
    });
  }
}
