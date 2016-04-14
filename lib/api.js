const {
  add,
  reply,
  remove,
  removeReply,
  edit,
  editReply,
  like,
  likeReply,
  star,
  starReply
} = CommentsCollection.methods;

Comments = {
  config: (function () {
    let config = {
      replies: true,
      anonymous: false,
      rating: 'likes',
      anonymousSalt: 'changeMe',
      mediaAnalyzers: [imageAnalyzer, youtubeAnalyzer],
      publishUserFields: { profile: 1, emails: 1, username: 1 }
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
  add,
  reply,
  remove,
  removeReply,
  edit,
  editReply,
  like,
  likeReply,
  star,
  starReply,
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

const setDefaultAvatar = (defaultImageUrl) => {
  Avatar.setOptions({ defaultImageUrl });
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

    setDefaultAvatar(config.defaultAvatar);

    return {
      config: function (newConfig) {
        if (!newConfig) {
          return config;
        }

        config = _.extend(config, newConfig);
        setDefaultAvatar(config.defaultAvatar);
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
