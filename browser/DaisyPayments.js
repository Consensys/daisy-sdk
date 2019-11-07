import ClientPayments from "../common/ClientPayments";

import ERC20 from "../contracts/lite/ERC20.json";

export default class DaisyPayments {
  get web3() {
    return this.withGlobals.web3 || window.web3;
  }

  constructor({ manager, override, withGlobals }) {
    this.manager = manager;
    this.withGlobals = withGlobals;
    this.override = override;
    this.client = ClientPayments.init(manager, override, withGlobals);
  }

  with(withGlobals) {
    return new DaisyPayments({
      manager: this.manager,
      override: this.override,
      withGlobals: { ...this.withGlobals, ...withGlobals },
    });
  }

  sync() {
    return this.client
      .request({
        method: "get",
        url: "/payments",
      })
      .then(({ data: body }) => {
        this.manager = { ...this.manager, ...body["data"] };
        return this;
      });
  }

  loadToken({ symbol, address } = {}) {
    if (address) {
      return new this.web3.eth.Contract(ERC20["abi"], address);
    } else if (symbol) {
      throw new Error("Not implemented yet");
    } else {
      return new this.web3.eth.Contract(
        ERC20["abi"],
        this.manager["tokenAddress"]
      );
    }
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
    if (!sendArgs.tokenOwner) {
      throw new Error(`balanceOf() was called without a tokenOwner specified. Be sure to call balanceOf() like:
      
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
}
