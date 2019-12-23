/** @module browser */

import DaisySubscriptions from "../common/DaisySubscriptions";
import DaisyPayments from "../common/DaisyPayments";

class DaisySDK extends DaisySubscriptions {
  constructor(manager, web3, override) {
    super({ manager, override, withGlobals: { web3 } });
  }
}

DaisySDK.Subscriptions = DaisySubscriptions;
DaisySDK.initSubscriptions = function initSubscriptions(...args) {
  const instance = new DaisySubscriptions(...args);
  return instance.sync();
};

DaisySDK.Payments = DaisyPayments;
DaisySDK.initPayments = function initPayments(...args) {
  const instance = new DaisyPayments(...args);
  return instance.sync();
};

export default DaisySDK;
