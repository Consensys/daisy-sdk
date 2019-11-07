/** @module common */

/* eslint promise/no-nesting: 0 */

const CONTENT_TYPE = "Content-Type";
const ACCEPT = "Accept";

function base64(string) {
  if (typeof window !== "undefined" && window.btoa) {
    return btoa(string);
  } else if (typeof Buffer !== "undefined") {
    return Buffer.from(string).toString("base64");
  } else {
    throw new Error("Can not convert to base64");
  }
}

function basic({ username, password }) {
  return `Basic ${base64(`${username}:${password || ""}`)}`;
}

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

  get fetch() {
    return this.withGlobals.fetch || window.fetch;
  }

  get Headers() {
    return this.withGlobals.Headers || this.fetch.Headers || window.Headers;
  }

  constructor(config, withGlobals = {}) {
    this.config = { ...Client.DEFAULT_CONFIG, ...config };
    this.config.baseURL = this.config.baseURL.replace(/\/$/, ""); // Remove trailing slash.
    this.withGlobals = withGlobals;
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
  request(
    args = { method: "get", url: "/", headers: {}, data: undefined, auth: {} }
  ) {
    // eslint-disable-next-line no-shadow
    const { fetch, Headers } = this;

    const method = args.method.toLowerCase();
    const isGET = method === "get";
    const qs = new URLSearchParams(isGET ? args.data : null).toString();
    const baseURL = this.config.baseURL;
    const url = qs ? `${baseURL}${args.url}?${qs}` : `${baseURL}${args.url}`;
    const headers = new Headers({
      ...this.config.headers,
      ...args.headers,
    });
    const auth = { ...args.auth, ...this.config.auth };
    if (auth.username || auth.password) {
      headers.set("Authorization", basic(auth));
    }
    const body = !isGET && args.data ? JSON.stringify(args.data) : undefined;
    const config = {
      method,
      headers,
      body,
    };

    return fetch(url, config).then(this.axiosify.bind(this), requestError => {
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
