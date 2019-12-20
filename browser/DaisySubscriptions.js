/** @module browser */

import ClientSubscriptions from "../common/ClientSubscriptions";

/**
 * Browser SDK class. This requires a {@link module:common~SubscriptionManager} object to be instantiated and a `web3` instance.
 * The `web3` instance may come from [react-metamask](https://github.com/consensys/react-metamask). If not present, it is taken from `window`.
 * @extends module:common~ClientSubscriptions
 */
export default class DaisySubscriptions extends ClientSubscriptions {}
