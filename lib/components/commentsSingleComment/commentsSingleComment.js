Template.commentsSingleComment.helpers(_.extend(defaultCommentHelpers, {
  hasLiked: function () {
    return this.likes.indexOf(Meteor.userId()) > -1;
  },
  isOwnComment: function () {
    return this.userId === Meteor.userId();
  },
  addReply: function () {
    const id = this._id || this.replyId;
    return Comments.session.equals('replyTo', id);
  },
  isEditable: function () {
    const id = this._id || this.replyId;
    return Comments.session.equals('editingDocument', id);
  },
  reply: function () {
    if (_.isFunction(this.enhancedReplies)) {
      return this.enhancedReplies();
    } else if (_.isArray(this.enhancedReplies)) {
      return this.enhancedReplies;
    }
  },
  avatarUrl: function() {
    return Avatar.getUrl(
      Meteor.users.findOne(this.userId)
    );
  }
}));
