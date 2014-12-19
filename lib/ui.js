Comments.ui = (function () {
  Avatar.options = {
    defaultImageUrl: 'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png'
  };

  var config = {
    template: 'semantic-ui'
  };

  return {
    config: function (newConfig) {
      if (!newConfig) {
        return config;
      }

      config = _.extend(config, newConfig);
    }
  };
})();