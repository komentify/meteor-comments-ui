import mediaService from './services/media'
import imageAnalyzer from './services/media-analyzers/image'
import youtubeAnalyzer from './services/media-analyzers/youtube'
import userService from './services/user'

const {
  add,
  reply,
  remove,
  removeReply,
  edit,
  editReply,
  like,
  likeReply,
  dislike,
  dislikeReply,
  star,
  starReply
} = CommentsCollection.methods

Comments = {
  config: (function () {
    let config = {
      replies: true,
      anonymous: false,
      rating: 'likes',
      anonymousSalt: 'changeMe',
      mediaAnalyzers: [imageAnalyzer, youtubeAnalyzer],
      publishUserFields: { profile: 1, emails: 1, username: 1 },
      onEvent: () => {},
      sortingOptions: [
        { value: 'newest', label: 'Newest', sortSpecifier: { createdAt: -1 } },
        { value: 'oldest', label: 'Oldest', sortSpecifier: { createdAt: 1 } },
        { value: 'rating', label: 'Best rating', sortSpecifier: { ratingScore: -1 } }
      ],
      sweetCaptcha: false,
    }

    return (newConfig) => {
      if (!newConfig) {
        return config
      }

      config = _.extend(config, newConfig)
    }
  })(),
  get: (id, sorting = null) => {
    if (!sorting) {
      sorting = { createdAt: -1 }
    }

    return CommentsCollection.find({ referenceId: id }, { sort: sorting })
  },
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
  dislike,
  dislikeReply,
  star,
  starReply,
  session: new ReactiveDict('commentsUi'),
  changeSchema: function (cb) {
    var currentSchema = CommentsCollection.simpleSchema().schema(),
      callbackResult = cb(currentSchema),
      newSchema

    newSchema = callbackResult ? callbackResult : currentSchema
    !!newSchema && CommentsCollection.attachSchema(newSchema, { replace: true })
  },
  getCount: (id, cb) => Meteor.call('comments/count', id, cb),
  analyzers: {
    image: imageAnalyzer,
    youtube: youtubeAnalyzer
  },
  getCollection: () => CommentsCollection,
  getSortOption: (sorting) => {
    const options = _.filter(Comments.config().sortingOptions, (option) => option.value === sorting)

    if (0 === options.length) {
      throw new Meteor.Error('Invalid sorting specified')
    }

    return options[0].sortSpecifier
  },
  _collection: CommentsCollection,
  _anonymousCollection: AnonymousUserCollection,
  _mediaService: mediaService
}

if (Meteor.isClient) {
  Comments.ui = (function () {
    let config = {
      limit: 5,
      loadMoreCount: 10,
      template: 'semantic-ui',
      defaultAvatar:'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png',
      markdown: false,
      commentActions: [],
      onError: () => {},
    }

    return {
      config: function (newConfig) {
        if (!newConfig) {
          return config
        }

        config = _.extend(config, newConfig)
      },
      setContent: (content) => Comments.session.set('content', content),
      callIfLoggedIn: function (action, cb) {
        if (!userService.getUserId()) {
          Comments.session.set('loginAction', action)
        } else {
          return cb()
        }
      },
      getSorting: function (id) {
        return Comments.session.get(id + '_sorting')
      },
      resetError: function () {
        Comments.session.set('commentError', null)
      },
      setError: function (key) {
        Comments.session.set('commentError', key)
        Comments.ui.config().onError(key)
      }
    }
  })()
}
