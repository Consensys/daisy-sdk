const sortBy = require("lodash/sortBy");
const pick = require("lodash/pick");

require("dotenv").config();

// https://medium.com/@andrei.pfeiffer/jest-matching-objects-in-array-50fe2f4d6b98
expect.extend({
  toContainObject(received, argument) {
    const pass = this.equals(
      received,
      expect.arrayContaining([expect.objectContaining(argument)])
    );

    if (pass) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} not to contain object ${this.utils.printExpected(argument)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} to contain object ${this.utils.printExpected(argument)}`,
        pass: false,
      };
    }
  },
});

// Invalid Ethereum address
const INVALID = "0x0";
// Rinkeby test token
const DSY = "0x6FB3222E6134892a622D3990E3C94D75FF772b18";
// Mainnet Single Collateral DAI token
const SAI = "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359";

function sort(array, fields = ["id"]) {
  return sortBy(pick(array, fields), fields);
}

/**
 * Make an array of ojects compatible with Jest's `describe.each()` function.
 * See: https://stackoverflow.com/questions/56800074/jest-each-name-access-object-key
 */
function CASE(array, accessor = "id") {
  if (!array) {
    return undefined;
  }
  return array.map(element => [element[accessor], element]);
}

/**
 * Prevent crash if array of cases is empty
 */
function describeEach(array, accessor) {
  if (!array || array.length === 0) {
    return describe.skip.each([["SKIP BECAUSE ITERATOR IS EMPTY"]]);
  } else {
    return describe.each(CASE(array, accessor));
  }
}

exports.INVALID = INVALID;
exports.DSY = DSY;
exports.SAI = SAI;

exports.sort = sort;
exports.CASE = CASE;
exports.describeEach = describeEach;
