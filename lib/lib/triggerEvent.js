export const triggerEvent = (name, action, payload) => {
  const func = Comments.config().onEvent

  if (func) func(name, action, payload)
}
