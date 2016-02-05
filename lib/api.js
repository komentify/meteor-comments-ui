// TODO: split up model into separate files with a comments service
// TODO: refactor userId logic into the userService and also retrieving users
// TODO: extract action bar into own component?
// TODO: tests for comments.config()
// TODO: publish configurable
// TODO: see github for other issues

Comments = {
  config: (function () {
    let config = {
      replies: true,
      anonymous: false
    };

    return (newConfig) => {
      if (!newConfig) {
        return config;
      }

      config = _.extend(config, newConfig);
    };
  })(),
  get: (id) => CommentsCollection.find({ referenceId: id }, { sort: { createdAt: -1 } }),
  getOne: (id) => CommentsCollection.findOne({ _id: id }),
  getAll: () => CommentsCollection.find({}, { sort: { createdAt: -1 } }),
  add: (referenceId, content) => Meteor.call('comments/add', referenceId, content),
  edit: (documentId, newContent) => Meteor.call('comments/edit', documentId, newContent),
  remove: (documentId) => Meteor.call('comments/remove', documentId),
  like: (documentId) => Meteor.call('comments/like', documentId),
  reply: (documentId, docScope, content) => Meteor.call('comments/reply/add', documentId, docScope, content),
  editReply: (documentId, docScope, content) => Meteor.call('comments/reply/edit', documentId, docScope, content),
  removeReply: (documentId, docScope) => Meteor.call('comments/reply/remove', documentId, docScope),
  likeReply: (documentId, docScope) => Meteor.call('comments/reply/like', documentId, docScope),
  session: new ReactiveDict('commentsUi'),
  changeSchema: function (cb) {
    var currentSchema = CommentsCollection.simpleSchema().schema(),
      callbackResult = cb(currentSchema),
      newSchema;

    newSchema = callbackResult ? callbackResult : currentSchema;
    !!newSchema && CommentsCollection.attachSchema(newSchema, { replace: true });
  },
  _collection: CommentsCollection
};

if (Meteor.isClient) {
  Comments.ui = (function () {
    let config = {
      limit: 10,
      loadMoreCount: 20,
      template: 'semantic-ui',
      defaultAvatar:'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png',
      markdown: false
    };

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
}
