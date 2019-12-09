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

function isArray(value) {
  return Array.isArray(value);
}

function isObject(value) {
  // eslint-disable-next-line
  return value && typeof value === "object" && value.constructor === Object;
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

  static materialize(response) {
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

  static axiosify(response) {
    return Client.materialize(response).then(materialized => {
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

  static querystring(query = {}) {
    if (!isObject(query)) {
      throw new TypeError("Query params should be an object.");
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }
      } else if (isObject(value)) {
        params.append(key, encodeURIComponent(JSON.stringify(value)));
      } else {
        params.append(key, value);
      }
    }
    return params;
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
   * {
   *   method: 'post',
   *   url: '/users/',
   *   data: { firstName: 'Fred', lastName: 'Flintstone' }
   *  }
   *
   * @example
   * {
   *   method: 'get',
   *   url: '/users/',
   *   query: { firstName: 'Fred' }
   *  }
   */
  request(
    args = {
      method: "get",
      url: "/",
      headers: {},
      query: {},
      data: undefined,
      auth: {},
    }
  ) {
    // eslint-disable-next-line no-shadow
    const { fetch, Headers } = this;

    const method = args.method.toLowerCase();

    const querystring = Client.querystring(args.query);
    const qs = querystring.toString();
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

    const body = args.data ? JSON.stringify(args.data) : undefined;

    const config = {
      method,
      headers,
      body,
    };

    return fetch(url, config).then(Client.axiosify, requestError => {
      // eslint-disable-next-line no-param-reassign
      requestError.request = {};
      throw requestError;
    });
  }

  HEAD(url, query) {
    return this.request({ method: "head", url, query });
  }

  GET(url, query) {
    return this.request({ method: "get", url, query });
  }

  POST(url, data) {
    return this.request({ method: "post", url, data });
  }

  PATCH(url, data) {
    return this.request({ method: "patch", url, data });
  }

  UPDATE(url, data) {
    return this.request({ method: "update", url, data });
  }

  DELETE(url, data) {
    return this.request({ method: "delete", url, data });
  }
}

module.exports = Client;
