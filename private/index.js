/** @module private */

const ServerSubscriptions = require("./ServerSubscriptions");
const ServerPayments = require("./ServerPayments");

exports.ServerSubscriptions = ServerSubscriptions;
exports.initSubscriptions = function initSubscriptions(args) {
  const instance = new ServerSubscriptions(args);
  return instance.sync();
};

exports.ServerPayments = ServerPayments;
exports.initPayments = function initPayments(args) {
  const instance = new ServerPayments(args);
  return instance.sync();
};

/**
 * Legacy and deprecating soon.
 */
exports.ServiceSubscriptions = class ServiceSubscriptions extends ServerSubscriptions {
  constructor(manager, override, withGlobals) {
    super({ manager, override, withGlobals });
  }
};
