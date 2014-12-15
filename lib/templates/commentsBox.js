// TODO: Subscribe to comments on created
// TODO: Remove subscription on removed
// TODO: semantic ui + bootstrap support, i18n, account avatars

Template.commentsBox.helpers({
  comment: function () {
    return Comments.get(this.id);
  },
  likeText: function () {
    return this.likes.indexOf(Meteor.userId()) === -1 ? 'Like' : 'Remove like';
  }
});

Template.commentsBox.events({
  'submit .create-form' : function (e) {
    var textarea = $(e.target).find('.create-comment');

    Comments.add(this.id, textarea.val());
    textarea.val('');
    e.preventDefault();
  },
  'click .like' : function () {
    Comments.like(this._id);
  },
  'click .remove' : function () {
    Comments.remove(this._id);
  }
});
