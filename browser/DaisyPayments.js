import ClientPayments from "../common/ClientPayments";

import ERC20 from "../contracts/lite/ERC20.json";

export default class DaisyPayments extends ClientPayments {
  get web3() {
    return this.withGlobals.web3 || window.web3;
  }

  constructor({ manager, override, withGlobals }) {
    super(manager, override, withGlobals);
    this.manager = manager;
    this.override = override;
  }

  with(withGlobals) {
    return new DaisyPayments({
      manager: this.manager,
      override: this.override,
      withGlobals: { ...this.withGlobals, ...withGlobals },
    });
  }

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
      return this;
    });
  }

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

  prepareToken(token) {
    return new DaisyPaymentsOnToken({ manager: this.manager, token });
  }
}

export class DaisyPaymentsOnToken {
  constructor({ manager, token }) {
    this.manager = manager;
    this.token = token;
  }

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
   * Transfer token to an address "predicted" by create2.
   * @async
   */
  pay(invoice, sendArgs) {
    const price = invoice["invoicedPrice"];
    const address = invoice["address"];
    return this.token.methods["transfer"](address, price).send(sendArgs);
  }

  getTransfers(invoice, opts = { fromBlock: 0, toBlock: "latest" }) {
    const address = invoice["address"];
    return this.token.getPastEvents("Transfer", {
      filter: { to: [address] },
      ...opts,
    });
  }
}
