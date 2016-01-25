Package.describe({
  name: 'arkham:comments-ui',
  summary: 'Simple templates for disqus-like comment functionality',
  version: '0.2.13',
  git: 'https://github.com/ARKHAM-Enterprises/meteor-comments-ui.git'
});

Package.onUse(function(api) {
  // Meteor Version
  api.versionsFrom('METEOR@1.0.1');

  // Meteor Core Dependencies
  api.use(['accounts-password@1.0.1'], { weak: true });
  api.use([
    'underscore', 'mongo-livedata', 'templating', 'jquery', 'check', 'less@2.5.0_2', 'tracker', 'check', 'session', 'random', 'markdown'
  ]);

  // Atmosphere Package Dependencies
  api.use([
    'aldeed:collection2@2.5.0', 'aldeed:simple-schema@1.3.3', 'dburles:collection-helpers@1.0.3',
    'momentjs:moment@2.10.6', 'rzymek:moment-locales@2.9.0', 'utilities:avatar@0.9.1', 'reywood:publish-composite@1.4.2',
    'aldeed:template-extension@3.4.3'
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
  api.addFiles('tests/ui-tests.js', 'client');
});
