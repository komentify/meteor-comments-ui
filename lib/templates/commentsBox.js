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
    },
    loginAction: function () {
      return Comments.session.get('loginAction');
    },
    take: function (params) {
      if (this.content && this.content[params.hash.key]) {
        return this.content[params.hash.key];
      }

      return params.hash.default;
    }
  });

  Template.commentsBox.events({
    'submit .create-form' : function (e) {
      var eventScope = this;

      Comments.ui.callIfLoggedIn('add comments', function () {
        var textarea = $(e.target).find('.create-comment'),
          value = textarea.val();

        if (value) {
          Comments.add(eventScope.id, value);
        }

        textarea.val('');
      });

      e.preventDefault();
    },
    'keyup .create-comment' : function (e) {
      var eventScope = this;

      if (e.ctrlKey && e.keyCode == 13) {
        Comments.ui.callIfLoggedIn('add comments', function () {
          var textarea = $(e.target),
            value = textarea.val();

          if (value) {
            Comments.add(eventScope.id, value);
          }

          textarea.val('');
        });

        e.preventDefault();
      }
    },
    'click .like-action' : function () {
      var eventScope = this;

      Comments.ui.callIfLoggedIn('like comments', function () {
        Comments.like(eventScope._id);
      });
    },
    'click .remove-action' : function () {
      var eventScope = this;

      Comments.ui.callIfLoggedIn('remove comments', function () {
        Comments.remove(eventScope._id);
      });
    }
  });
})();
