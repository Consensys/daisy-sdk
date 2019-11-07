/** @module private */

const ServerSubscriptions = require("./ServerSubscriptions");

class ServiceSubscriptions extends ServerSubscriptions {
  constructor(manager, override, withGlobals) {
    super({ manager, override, withGlobals });
  }
}

exports = module.exports = {}; // eslint-disable-line
exports.ServerSubscriptions = ServerSubscriptions;
exports.ServiceSubscriptions = ServiceSubscriptions; // Legacy
