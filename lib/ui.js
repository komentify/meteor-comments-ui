Comments.ui = (function () {
  Tracker.autorun(function () {
    var userId = Meteor.userId();

    if (userId) {
      Comments.session.set('loginAction', '');
    }
  });

  var config = {
    limit: 10,
    loadMoreCount: 20,
    template: 'semantic-ui',
    defaultAvatar:'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png'
  };

  Meteor.startup(function () {
    Avatar.options = {
      defaultImageUrl: config.defaultAvatar
    };
  });
  
  // Default values
  Comments.session.set('content', {});

  return {
    config: function (newConfig) {
      if (!newConfig) {
        return config;
      }

      config = _.extend(config, newConfig);
    },
    setContent: function (content) {
      Comments.session.set('content', content);
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