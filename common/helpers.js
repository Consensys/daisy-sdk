export const TYPES = {
  EIP712Domain: { verifyingContract: "address" },

  // "Subscription(address to,uint256 value,bytes data,uint8 operation,uint256 txGas,uint256 dataGas,uint256 gasPrice,uint256 gasToken,address refundAddress,Meta meta)Meta(bytes32 planId,uint256 startDate,uint256 expires)"
  Subscription: {
    to: "address",
    value: "uint256",
    data: "bytes",
    operation: "uint8",
    txGas: "uint256",
    dataGas: "uint256",
    gasPrice: "uint256",
    gasToken: "address",
    refundAddress: "address",
    meta: "Meta",
  },

  // "Meta(bytes32 planId,uint256 startDate,uint256 expires)"
  Meta: {
    planId: "bytes32",
    startDate: "uint256",
    expires: "uint256",
  },
};

export function getTypedData(types, domain, primaryType, subscription) {
  const eipTypes = {};

  Object.keys(types).forEach(key => {
    const type = types[key];
    eipTypes[key] = Object.keys(type).map(name => ({
      name,
      type: type[name],
    }));
  });

  return {
    types: eipTypes,
    domain,
    primaryType,
    message: subscription,
  };
}

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
