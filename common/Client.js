/** @module common */

const axios = require("axios");

/**
 * Base HTTP client based on `axios`
 * @see {@link https://github.com/axios/axios} for further information.
 */
class Client {
  static get DEFAULT_CONFIG() {
    return {
      baseURL: "https://sdk.daisypayments.com",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // withCredentials: true,
      // credentials: "same-origin",
    };
  }

  /**
   * Create a Client instance with a `config` object for `axios`.
   * @see {@link https://github.com/axios/axios#creating-an-instance} for further information.
   * @param {Object} config - `axios` config object, will be merged with `Client.DEFAULT_CONFIG`.
   */
  constructor(config) {
    this.config = { ...Client.DEFAULT_CONFIG, ...config };
    this.axios = axios.create(config);
    this.axios.interceptors.response.use(Client.preprocess, Client.catch);
  }

  /**
   * @private
   */
  static preprocess(res) {
    return res;
  }

  /**
   * Make `error.message` match the error string from the server's `data.message`.
   * @private
   */
  static catch(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // `error.response.data`
      // `error.response.status`
      // `error.response.headers`
      error.message = error.response.data.message; // eslint-disable-line no-param-reassign
      return Promise.reject(error);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest
      // `error.request`
      return Promise.reject(error);
    } else {
      // Something happened in setting up the request that triggered an Error
      // `error.message`
      return Promise.reject(error);
    }
  }

  /**
   * @see {@link https://github.com/axios/axios#axiosconfig}
   * @private
   *
   * @example
   *
   * {
   *   method: 'post',
   *   url: '/user/12345',
   *   data: {
   *     firstName: 'Fred',
   *     lastName: 'Flintstone'
   *    }
   *  }
   */
  request(args) {
    return this.axios(args);
  }
}

module.exports = Client;
