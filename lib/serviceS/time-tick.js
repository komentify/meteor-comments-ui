timeTickService = (() => {
  const timeTick = new Tracker.Dependency();

// Reactive moment changes
  Meteor.setInterval(function () {
    timeTick.changed();
  }, 1000);

  moment.locale('en');

  return {
    fromNowReactive(mmt) {
      timeTick.depend();
      return mmt.fromNow();
    }
  };
})();
