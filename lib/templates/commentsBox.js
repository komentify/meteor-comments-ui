// TODO: Subscribe to comments on created
// TODO: Remove subscription on removed

Template.commentsBox.helpers({
  'comment' : function () {
    return Comments.get(this.id);
  }
});

Template.commentsBox.events({
  'submit .create-form' : function (e) {
    var textarea = $(e.target).find('.create-comment');

    Comments.add(this.id, textarea.val());
    textarea.val('');
    e.preventDefault();
  }
});
