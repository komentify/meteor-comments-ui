// TODO: i18n
// TODO: handle anon

(function () {
  var handles = {};

  Template.commentsBox.created = function () {
    if (!handles[this.data.id]) {
      handles[this.data.id] = Meteor.subscribe('comments/reference', this.data.id);
    }
  };

  Template.commentsBox.destroyed = function () {
    if (handles[this.data.id]) {
      handles[this.data.id].stop();
    }
  };

  Template.commentsBox.helpers({
    comment: function () {
      return Comments.get(this.id);
    },
    hasLiked: function () {
      return this.likes.indexOf(Meteor.userId()) > -1;
    },
    templateIs: function (name) {
      return name === Comments.ui.config().template;
    },
    isOwnComment: function () {
      return this.userId === Meteor.userId();
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
})();
