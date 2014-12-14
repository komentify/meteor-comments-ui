Package.describe({
  name: 'arkham:comments-ui',
  summary: 'Simple, extendable templates for comment functionality',
  version: '1.0.0',
  git: 'https://github.com/ARKHAM-Enterprises/meteor-comments-ui.git'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.1');
  api.addFiles('comments-ui.js');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('comments-ui');
  api.addFiles('comments-ui-tests.js');
});
