export const TYPES = {
  EIP712Domain: [{ name: "verifyingContract", type: "address" }],

  Subscription: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "periodUnit", type: "string" },
    { name: "periods", type: "uint256" },
    { name: "maxExecutions", type: "uint256" },
    { name: "start", type: "uint256" },
    { name: "plan", type: "string" },
    { name: "nonce", type: "bytes32" },
  ],

  PlanAuthorization: [
    { name: "subscriptionHash", type: "bytes32" },
    { name: "subscriber", type: "address" },
  ],

  AddPlan: [
    { name: "plan", type: "string" },
    { name: "price", type: "uint256" },
    { name: "periodUnit", type: "string" },
    { name: "periods", type: "uint256" },
    { name: "maxExecutions", type: "uint256" },
    { name: "private", type: "bool" },
  ],

  RemovePlan: [{ name: "plan", type: "string" }],

  SetActive: [
    { name: "plan", type: "string" },
    { name: "active", type: "bool" },
    { name: "nonce", type: "bytes32" },
  ],
};

export async function signTypedData(web3, signer, data) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        method: "eth_signTypedData_v3",
        params: [signer, JSON.stringify(data)],
        from: signer,
      },
      function callback(err, result) {
        if (err || result.error) {
          return reject(err || result.error);
        }

        const signature = result.result;
        return resolve(signature);
      }
    );
  });
}
