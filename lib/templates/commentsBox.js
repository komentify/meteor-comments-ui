// TODO: Subscribe to comments on created
// TODO: Remove subscription on removed
// TODO: semantic ui + bootstrap support, i18n, account avatars

Template.commentsBox.helpers({
  comment: function () {
    return Comments.get(this.id);
  },
  hasLiked: function () {
    return this.likes.indexOf(Meteor.userId()) > -1;
  },
  templateIs: function (name) {
    return name === Comments.ui.config().template;
  }
});

Template.commentsBox.events({
  'submit .create-form' : function (e) {
    var textarea = $(e.target).find('.create-comment');

    Comments.add(this.id, textarea.val());
    textarea.val('');
    e.preventDefault();
  },
  'keyup .create-comment' : function (e) {
    var textarea;

    if (e.ctrlKey && e.keyCode == 13) {
      textarea = $(e.target);
      Comments.add(this.id, textarea.val());
      textarea.val('');
    }
  },
  'click .like' : function () {
    Comments.like(this._id);
  },
  'click .remove' : function () {
    Comments.remove(this._id);
  }
});
