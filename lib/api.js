Comments = {
  config: (function () {
    let config = {
      replies: true,
      anonymous: false,
      anonymousSalt: 'changeMe',
      mediaAnalyzers: [imageAnalyzer, youtubeAnalyzer],
      publishUserFields: { profile: 1, emails: 1, username: 1 },
      beforeInsert: (function (e) { return {} }),
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
  add: CommentsCollection.methods.add,
  reply: CommentsCollection.methods.reply,
  remove: CommentsCollection.methods.remove,
  edit: CommentsCollection.methods.edit,
  like: CommentsCollection.methods.like,
  likeReply: CommentsCollection.methods.likeReply,
  editReply: CommentsCollection.methods.editReply,
  removeReply: CommentsCollection.methods.removeReply,
  session: new ReactiveDict('commentsUi'),
  changeSchema: function (cb) {
    var currentSchema = CommentsCollection.simpleSchema().schema(),
      callbackResult = cb(currentSchema),
      newSchema;

    newSchema = callbackResult ? callbackResult : currentSchema;
    !!newSchema && CommentsCollection.attachSchema(newSchema, { replace: true });
  },
  analyzers: {
    image: imageAnalyzer,
    youtube: youtubeAnalyzer
  },
  getCollection: () => CommentsCollection,
  _collection: CommentsCollection,
  _anonymousCollection: AnonymousUserCollection,
  _mediaService: mediaService
};

if (Meteor.isClient) {
  Comments.ui = (function () {
    let config = {
      limit: 5,
      loadMoreCount: 10,
      template: 'semantic-ui',
      defaultAvatar:'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png',
      markdown: false
    };
    Avatar.setOptions({
      defaultImageUrl: 'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png'
    });

    return {
      config: function (newConfig) {
        if (!newConfig) {
          return config;
        }

        config = _.extend(config, newConfig);
      },
      setContent: (content) => Comments.session.set('content', content),
      callIfLoggedIn: function (action, cb) {
        if (!userService.getUserId()) {
          Comments.session.set('loginAction', action);
        } else {
          return cb();
        }
      }
    };
  })();
}
