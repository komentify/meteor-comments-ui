(function () {
  var defaultCommentHelpers = {
      take: function (params) {
        if (this.content && this.content[params.hash.key]) {
          return this.content[params.hash.key];
        }

        return params.hash.default;
      },
      templateIs: function (name) {
        return name === Comments.ui.config().template;
      },
      hasMoreComments: function () {
        return Comments.get(this.id).count() < Comments.session.get(this.id + '_count');
      },
      textarea: function () {
        return Template.commentsTextarea;
      },
      commentId: function () {
        return this._id || this.replyId;
      }
    },
    handles = {};

  Template.commentsBox.created = function () {
    var tplScope = this,
      limit = Comments.ui.config().limit;

    if (!handles[tplScope.data.id]) {
      Comments.session.set(this.data.id + '_currentLimit', limit);
      handles[tplScope.data.id] = Meteor.subscribe('comments/reference', tplScope.data.id, limit);
    }

    Meteor.call('comments/count', tplScope.data.id, function (err, count) {
      Comments.session.set(tplScope.data.id + '_count', count);
    });
  };

  Template.commentsTextarea.helpers(_.extend(defaultCommentHelpers, {
    addButtonKey: function () {
      return this.reply ? 'add-button-reply' : 'add-button';
    },
    addButtonText: function () {
      return this.reply ? 'Add Reply' : 'Add Comment';
    }
  }));

  Template.commentsSingleComment.helpers(_.extend(defaultCommentHelpers, {
    hasLiked: function () {
      return this.likes.indexOf(Meteor.userId()) > -1;
    },
    isOwnComment: function () {
      return this.userId === Meteor.userId();
    },
    loginAction: function () {
      return Comments.session.get('loginAction');
    },
    addReply: function () {
      var id = this._id || this.replyId;
      return Comments.session.get('replyTo') === id;
    },
    isEditable: function () {
      var id = this._id || this.replyId;
      return Comments.session.get('editingDocument') === id;
    },
    reply: function () {
      if (_.isFunction(this.enhancedReplies)) {
        return this.enhancedReplies();
      } else if (_.isArray(this.enhancedReplies)) {
        return this.enhancedReplies;
      }
    }
  }));

  Template.commentsBox.destroyed = function () {
    if (handles[this.data.id]) {
      handles[this.data.id].stop();
    }
  };

  Template.commentsBox.helpers(_.extend(defaultCommentHelpers, {
    comment: function () {
      return Comments.get(this.id);
    }
  }));

  Template.commentsBox.events({
    'submit .comment-form, keyup .create-comment' : function (e) {
      var eventScope = this;

      e.preventDefault();

      if ((e.originalEvent instanceof KeyboardEvent && e.keyCode === 13 && e.ctrlKey) || "submit" === e.type) {
        Comments.ui.callIfLoggedIn('add comments', function () {
          var textarea = $(e.target).parent().find('.create-comment'),
              value = textarea.val().trim();

          if (value) {
            Comments.add(eventScope.id, value);
            textarea.val('');
          }
        });
      }
    },
    'submit .reply-form, keyup .create-reply' : function (e) {
      var eventScope = this;

      e.preventDefault();

      if ((e.originalEvent instanceof KeyboardEvent && e.keyCode === 13 && e.ctrlKey) || "submit" === e.type) {
        Comments.ui.callIfLoggedIn('add replies', function () {
          var id = eventScope.scope._id || eventScope.scope.documentId,
              textarea = $(e.target).parent().find('.create-reply'),
              value = textarea.val().trim();

          if (value) {
            Comments.reply(id, eventScope.scope, value);
            Comments.session.set('replyTo', null);
          }
        });
      }
    },
    'click .like-action' : function () {
      var eventScope = this;

      Comments.ui.callIfLoggedIn('like comments', function () {
        if (eventScope._id) {
          Comments.like(eventScope._id);
        } else if (eventScope.replyId) {
          Comments.likeReply(eventScope.documentId, eventScope);
        }
      });
    },
    'click .remove-action' : function () {
      var tplScope = Template.currentData(),
        eventScope = this;

      Comments.ui.callIfLoggedIn('remove comments', function () {
        if (eventScope._id) {
          Comments.remove(eventScope._id);
          Comments.session.set(tplScope.id + '_count', (Comments.session.get(tplScope.id + '_count') - 1));
        } else if (eventScope.replyId) {
          Comments.removeReply(eventScope.documentId, eventScope);
        }
      });
    },
    'click .reply-action': function () {
      var id = this._id || this.replyId;
      Comments.session.set('replyTo', id);
    },
    'click .edit-action' : function (e) {
      var id = this._id || this.replyId;

      $('.comment-content').attr('contenteditable', false);
      $(e.target).closest('.comment').find('.comment-content[data-id="' + id + '"]').attr('contenteditable', true);
      Comments.session.set('editingDocument', id);
    },
    'click .save-action' : function (e) {
      var id = this._id || this.replyId,
        contentBox = $(e.target).closest('.comment').find('.comment-content[data-id="' + id + '"]'),
        newContent = contentBox.text().trim();

      contentBox.attr('contenteditable', false);
      Comments.session.set('editingDocument', '');
      contentBox.children().remove();

      if (this.content !== newContent) {
        if (this._id) {
          Comments.edit(id, newContent);
        } else if (this.replyId) {
          Comments.editReply(this.documentId, this, newContent);
        }
      }
    },
    'click .loadmore-action' : function () {
      var tplScope = this,
        handle = handles[tplScope.id],
        currentLimit = Comments.session.get(tplScope.id + '_currentLimit') + Comments.ui.config().loadMoreCount;


      Meteor.call('comments/count', tplScope.id, function (err, count) {
        Comments.session.set(tplScope.id + '_count', count);
      });
      Comments.session.set(tplScope.id + '_currentLimit', currentLimit);
      handles[tplScope.id] = Meteor.subscribe('comments/reference', tplScope.id, currentLimit);
      handle && handle.stop();
    }
  });
})();
