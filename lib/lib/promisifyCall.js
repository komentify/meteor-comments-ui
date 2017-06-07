export const promisifyCall = (doCall, ...callArgs) => new Promise((res, rej) => doCall(
  ...callArgs,
  (err, data) => (err ? rej(err) : res(data)),
))
