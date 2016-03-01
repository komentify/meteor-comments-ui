Template.commentsSingleComment.helpers(_.extend(defaultCommentHelpers, {
  hasLiked() {
    return this.likes.indexOf(userService.getUserId()) > -1;
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
