/** @module common */

/* eslint promise/no-nesting: 0 */

const CONTENT_TYPE = "Content-Type";
const ACCEPT = "Accept";

/**
 * Base HTTP client
 */
class Client {
  static get DEFAULT_CONFIG() {
    return {
      baseURL: "https://sdk.daisypayments.com",
      headers: {
        [ACCEPT]: "application/json",
        [CONTENT_TYPE]: "application/json",
      },
    };
  }

  constructor(config) {
    this.config = { ...Client.DEFAULT_CONFIG, ...config };
    // Remove trailing slash.
    this.config.baseURL = this.config.baseURL.replace(/\/$/, "");
  }

  /**
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
  request(args = { method: "get", url: "/", headers: {}, data: undefined }) {
    const method = args.method.toLowerCase();
    const isGET = method === "get";
    const qs = new URLSearchParams(isGET ? args.data : null).toString();
    const url = `${this.config.baseURL}${args.url}?${qs}`;
    const headers = new Headers({
      ...this.config.headers,
      ...args.headers,
    });
    const config = {
      method,
      headers,
      body: !isGET && args.data ? JSON.stringify(args.data) : undefined,
    };

    return fetch(url, config).then(this.axiosify, requestError => {
      // eslint-disable-next-line no-param-reassign
      requestError.request = {};
      throw requestError;
    });
  }

  materialize(response) {
    const content =
      response.headers.has(CONTENT_TYPE) && response.headers.get(CONTENT_TYPE);

    switch (content) {
      case "text/html":
        return response.text();
      case "application/json":
      default:
        return response.json();
    }
  }

  axiosify(response) {
    return this.materialize(response).then(materialized => {
      if (response.ok) {
        return {
          data: materialized,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          // config,
        };
      } else {
        const error = new Error(materialized["message"]);
        error.response = {
          data: materialized,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };
        throw error;
      }
    });
  }
}

module.exports = Client;
