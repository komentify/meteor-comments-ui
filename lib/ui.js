Comments.ui = (function () {
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