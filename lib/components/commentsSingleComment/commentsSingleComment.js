Template.commentsSingleComment.helpers(_.extend(defaultCommentHelpers, {
  customSingleCommentTemplate() {
    return defaultCommentHelpers.getCustomTemplate('singleCommentTemplate', Template.parentData());
  },
  hasLiked() {
    return this.likes && this.likes.indexOf(userService.getUserId()) > -1;
  },
  isOwnComment() {
    return this.userId === userService.getUserId();
  },
  addReply() {
    const id = this._id || this.replyId;
    return Comments.session.equals('replyTo', id);
  },
  isEditable() {
    const id = this._id || this.replyId;
    return Comments.session.equals('editingDocument', id);
  },
  mediaContent() {
    return mediaService.getMarkup(this.media);
  },
  isRating(type) {
    return Comments.config().rating === type;
  },
  rating() {
    return this.getStarRating();
  },
  canRate() {
    return userService.getUserId();
  },
  forceRender() {
    this.getStarRating();
  },
  getRatingClass(type) {
    if ('user' === type) {
      return 'own-rating';
    }

    return '';
  },
  reply() {
    if (_.isFunction(this.enhancedReplies)) {
      return this.enhancedReplies();
    } else if (_.isArray(this.enhancedReplies)) {
      return this.enhancedReplies;
    }
  },
  avatarUrl() {
    return Avatar.getUrl(
      Meteor.users.findOne(this.userId)
    ) || Comments.ui.config().defaultAvatar;
  }
}));

Template.commentsSingleComment.onRendered(function () {
  // fix wrong blaze rendering
  $('.stars-rating').each(function () {
    const starRatingElement = $(this);

    if (starRatingElement.data('rating') == 0) {
      starRatingElement.find('.current-rating').removeClass('current-rating');
    }
  });
});
