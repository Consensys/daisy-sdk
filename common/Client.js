const axios = require("axios");

class Client {
  static get DEFAULT_CONFIG() {
    return {
      baseURL: "http://localhost:8000",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // withCredentials: true,
      // credentials: "same-origin",
    };
  }

  constructor(config = Client.DEFAULT_CONFIG) {
    this.config = config;
    this.axios = axios.create(config);
    this.axios.interceptors.response.use(Client.preprocess, Client.catch);
  }

  static preprocess(res) {
    return res;
  }

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

  /** Example: https://github.com/axios/axios#axiosconfig
   {
     method: 'post',
     url: '/user/12345',
     data: {
       firstName: 'Fred',
       lastName: 'Flintstone'
      }
    }
  */
  request(args) {
    return this.axios(args);
  }
}

module.exports = Client;
