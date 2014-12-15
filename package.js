Package.describe({
  name: 'arkham:comments-ui',
  summary: 'Simple, extendable templates for comment functionality',
  version: '0.1.0',
  git: 'https://github.com/ARKHAM-Enterprises/meteor-comments-ui.git'
});

Package.onUse(function(api) {
  // Meteor Version
  api.versionsFrom('1.0.1');

  // Meteor Core Dependencies
  api.use(['underscore', 'mongo-livedata', 'templating', 'jquery']);

  // Atmosphere Package Dependencies
  api.use(['aldeed:collection2@2.2.0', 'aldeed:simple-schema@1.2.0', 'dburles:collection-helpers@1.0.1']);

  // Package specific globals and files
  api.addFiles('lib/model.js');
  api.addFiles(['lib/templates.html', 'lib/templates/commentsBox.js'], 'client');
  api.export('Comments');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('comments-ui');
});
