Comments.ui = (function () {
  Avatar.options = {
    defaultImageUrl: 'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png'
  };

  Tracker.autorun(function () {
    var userId = Meteor.userId();

    if (userId) {
      Comments.session.set('loginAction', '');
    }
  });

  var config = {
    template: 'semantic-ui',
    limit: 2,
    loadMoreCount: 1
  };

  return {
    config: function (newConfig) {
      if (!newConfig) {
        return config;
      }

      config = _.extend(config, newConfig);
    },
    callIfLoggedIn: function (action, cb) {
      if (!Meteor.userId()) {
        Comments.session.set('loginAction', action);
      } else {
        return cb();
      }
    }
  };
})();