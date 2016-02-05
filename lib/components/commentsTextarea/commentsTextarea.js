Template.commentsTextarea.helpers(_.extend(defaultCommentHelpers, {
  addButtonKey: function () {
    return this.reply ? 'add-button-reply' : 'add-button';
  },
  addButtonText: function () {
    return this.reply ? 'Add Reply' : 'Add Comment';
  },
  reply: function () {
    return this.reply;
  },
  anonymousUsername: function () {
    // TODO: set and return from localstorage
  },
  anonymousMail: function () {
    // TODO: set and return from localstorage, through a service
  }
}));
