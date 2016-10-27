import { Meteor } from 'meteor/meteor'
import mediaService from '../../services/media'
import userService from '../../services/user'

Template.commentsSingleComment.helpers(_.extend(defaultCommentHelpers, {
  customSingleCommentTemplate() {
    return defaultCommentHelpers.getCustomTemplate('singleCommentTemplate', 'commentsSingleComment', Template.parentData())
  },
  hasLiked() {
    return this.likes && this.likes.includes(userService.getUserId())
  },
  hasDisliked() {
    return this.dislikes && this.dislikes.includes(userService.getUserId())
  },
  isOwnComment() {
    return this.userId === userService.getUserId()
  },
  isChangeable() {
    return this.userId === userService.getUserId()
  },
  addReply() {
    const id = this._id || this.replyId
    return Comments.session.equals('replyTo', id)
  },
  isEditable() {
    const id = this._id || this.replyId
    return Comments.session.equals('editingDocument', id)
  },
  mediaContent() {
    return mediaService.getMarkup(this.media)
  },
  isRating: (...types) => types.includes(Comments.config().rating),
  rating() {
    return this.getStarRating()
  },
  canRate: () => userService.getUserId(),
  forceRender() {
    this.getStarRating()
  },
  getRatingClass(type) {
    if ('user' === type) {
      return 'own-rating'
    }

    return ''
  },
  commentAction() {
    return Comments.ui.config().commentActions
  },
  reply() {
    if (_.isFunction(this.enhancedReplies)) {
      return this.enhancedReplies()
    } else if (_.isArray(this.enhancedReplies)) {
      return this.enhancedReplies
    }
  },
  avatarUrl() {
    const config = Comments.ui.config()
    let avatar = config.defaultAvatar

    if (config.generateAvatar) {
      const userId = this.userId
      let user = Meteor.users.findOne(userId)
      const anonymousUser = AnonymousUserCollection.findOne({ _id: userId })

      const isAnonymous = !!anonymousUser

      if (isAnonymous) {
        user = anonymousUser
      }

      avatar = config.generateAvatar(user, isAnonymous) || avatar
    }

    return avatar
  }
}))

Template.commentsSingleComment.onRendered(function () {
  // fix wrong blaze rendering
  $('.stars-rating').each(function () {
    const starRatingElement = $(this)

    if (starRatingElement.data('rating') == 0) {
      starRatingElement.find('.current-rating').removeClass('current-rating')
    }
  })
})
