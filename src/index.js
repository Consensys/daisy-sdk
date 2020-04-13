const Client = require("./Client");

class DaisyGraphQLError extends Error {
  // See: https://github.com/babel/babel/issues/4485#issuecomment-315569892
  constructor({ message, locations, path, extensions }, data) {
    super(message);
    this.constructor = DaisyGraphQLError;
    // eslint-disable-next-line no-proto
    this.__proto__ = DaisyGraphQLError.prototype;
    this.message = message;
    this.locations = locations;
    this.path = path;
    this.extensions = extensions;
    this.data = data;
    this.isDaisyGraphQLError = true; // helper
  }
}

class Daisy {
  constructor(key, withGlobals = {}) {
    this.client = new Client(
      {
        baseURL: "http://localhost:3000/",
        // baseURL: "https://api.daisypayments.com",
        auth: { username: "", password: key },
      },
      withGlobals
    );
  }

  query(query, variables) {
    return this.graphql({ query, variables });
  }

  mutation(query, variables) {
    return this.graphql({ query, variables });
  }

  graphql(request = {}) {
    if (request.mutation) {
      throw new Error(
        "Argument `mutation` does not exist. Please use `query` even if you are making a GraphQL mutation."
      );
    }
    return this.client.POST("/graphql", request).then(response => {
      if (response.data["errors"]) {
        // Handle one error at a time
        const error = response.data["errors"][0];
        throw new DaisyGraphQLError(error, response.data["data"]);
      }
      // axios-like object and then take "data" from graphql JSON response
      return response.data["data"];
    });
  }
}

Daisy.DaisyGraphQLError = DaisyGraphQLError;

module.exports = Daisy;
