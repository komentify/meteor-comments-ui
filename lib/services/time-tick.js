const timeTickService = (() => {
  const timeTick = new Tracker.Dependency()

  // Reactive moment changes
  Meteor.setInterval(() => timeTick.changed(), 1000)

  

  return {
    fromNowReactive(mmt) {
      timeTick.depend()
      return mmt.fromNow()
    }
  }
})()

export default timeTickService
