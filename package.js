Package.describe({
  name: 'arkham:comments-ui',
  summary: 'Simple templates for disqus-like comment functionality',
  version: '0.2.15',
  git: 'https://github.com/ARKHAM-Enterprises/meteor-comments-ui.git'
});

Package.onUse(function(api) {
  // Meteor Version
  api.versionsFrom('METEOR@1.2.1');

  // Meteor Core Dependencies
  api.use(['accounts-password@1.0.1'], { weak: true });
  api.use([
    'accounts-base',
    'ecmascript',
    'underscore',
    'mongo-livedata',
    'templating',
    'jquery',
    'check',
    'less@2.5.0_2',
    'tracker',
    'check',
    'random',
    'markdown',
    'reactive-dict'
  ]);

  // Atmosphere Package Dependencies
  api.use([
    'aldeed:collection2@2.5.0', 'aldeed:simple-schema@1.3.3', 'dburles:collection-helpers@1.0.3',
    'momentjs:moment@2.10.6', 'rzymek:moment-locales@2.9.0', 'utilities:avatar@0.9.1', 'reywood:publish-composite@1.4.2',
    'aldeed:template-extension@3.4.3'
  ]);

  // Package specific globals and files
  api.addFiles([
    'lib/collections/anonymous-user.js',
    'lib/collections/comments.js',
    'lib/collections/methods/anonymous-user.js',
    'lib/collections/methods/comments.js'
  ]);

  api.addFiles([
    'lib/services/user.js',
    'lib/services/time-tick.js',
    'lib/services/media.js',
    'lib/components/commentsBox/commentsBox.html',
    'lib/components/commentsBox/commentsBox.less',
    'lib/components/commentsSingleComment/commentsSingleComment.html',
    'lib/components/commentsTextarea/commentsTextarea.html',
    'lib/api.js'
  ]);

  api.addFiles([
    'lib/components/helpers.js',
    'lib/components/commentsBox/commentsBox.js',
    'lib/components/commentsSingleComment/commentsSingleComment.js',
    'lib/components/commentsTextarea/commentsTextarea.js'
  ], 'client');

  api.addFiles([
    'lib/server/publish.js'
  ], 'server');

  api.export('Comments');
});

Package.onTest(function(api) {
  api.use(['tinytest', 'accounts-password']);
  api.use('arkham:comments-ui');

  api.addFiles('tests/api-tests.js');
  api.addFiles('tests/ui-tests.js', 'client');
});
