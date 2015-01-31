Package.describe({
  name: 'arkham:comments-ui',
  summary: 'Simple templates for disqus-like comment functionality',
  version: '0.1.0',
  git: 'https://github.com/ARKHAM-Enterprises/meteor-comments-ui.git'
});

Package.onUse(function(api) {
  // Meteor Version
  api.versionsFrom('1.0.1');

  // Meteor Core Dependencies
  api.use(['accounts-password@1.0.1'], { weak: true });
  api.use(['underscore', 'mongo-livedata', 'templating', 'jquery', 'check', 'less', 'tracker', 'check', 'session', 'random']);

  // Atmosphere Package Dependencies
  api.use([
    'aldeed:collection2@2.2.0', 'aldeed:simple-schema@1.2.0', 'dburles:collection-helpers@1.0.1',
    'flamparski:moment-locales@0.0.3', 'bengott:avatar@0.7.2', 'reywood:publish-composite@1.3.5'
  ]);

  // Package specific globals and files
  api.addFiles('lib/model.js');
  api.addFiles(['lib/templates.html', 'lib/templates/commentsBox.less']);
  api.addFiles(['lib/ui.js', 'lib/templates/commentsBox.js'], 'client');
  api.export('Comments');
});

Package.onTest(function(api) {
  api.use(['tinytest', 'accounts-password']);
  api.use('arkham:comments-ui');

  api.addFiles('tests/api-tests.js');
});
