/**
 * Add a comment, reply if the user has permission to do so.
 *
 * @param {Object} event
 * @param {String} type
 * @param {String} selector
 * @param {Function} callback
 */
function addComment(event, type, selector, callback) {
  const container = $(event.target).parent();

  if ("submit" === event.type) {
    event.preventDefault();
    executeUserAction(event, type, function addCommentCallback(anonymousData) {
      var textarea = container.find(selector),
        value = textarea.val().trim();

      callback(textarea, value, anonymousData);
    });
  }
}

function executeUserAction(event, type, callback) {
  if (userService.isAnonymous()) {
    const container = $(event.target).parent(),
      anonUserData = {
        username: (container.find('.anon-username').val() || ''),
        email: (container.find('.anon-email').val() || '')
      };

    userService.updateAnonymousUser(anonUserData, callback);
  } else {
    Comments.ui.callIfLoggedIn(type, callback);
  }
}

Comments.session.set('content', {});

Template.commentsBox.onCreated(function () {
  const tplScope = this;

  Avatar.setOptions({
    defaultImageUrl: Comments.ui.config().defaultAvatar
  });

  Comments.session.set(`${tplScope.data.id}_currentLimit`, Comments.ui.config().limit);

  this.autorun(function () {
    const limit = Comments.session.get(`${tplScope.data.id}_currentLimit`);

    tplScope.subscribe('comments/reference', tplScope.data.id, limit);

    Meteor.call('comments/count', tplScope.data.id, function (err, count) {
      Comments.session.set(tplScope.data.id + '_count', count);
    });

    if (userService.isAnonymous()) {
      const userData = userService.getUserData();

      Comments.session.set('loginAction', '');

      userData._id && userData.salt && Meteor.subscribe('comments/anonymous', userData);
    }
  });

  this.autorun(function () {
    if(Meteor.userId()) {
      Comments.session.set('loginAction', '');
    }
  })
});

Template.commentsBox.helpers(_.extend(defaultCommentHelpers, {
  comment() {
    return Comments.get(this.id);
  },
  customTpl() {
    if (_.isString(this.customTemplate)) {
      Template[this.customTemplate].inheritsHelpersFrom("commentsBox");
      return Template[this.customTemplate];
    }
  },
  commentsBoxTitle() {
    let title = defaultCommentHelpers.take({
      hash: {
        key: 'title',
        'default': 'Comments'
      }
    });

    const data = Template.instance().data;

    if (data && data.title) {
      title =  `${title} for ${data.title}`;
    }

    return title;
  }
}));

Template.commentsBox.events({
  'keydown .create-comment, keydown .create-reply': _.debounce((e) => {
    if (e.originalEvent instanceof KeyboardEvent && e.keyCode === 13 && e.ctrlKey) {
      e.preventDefault();
      $(e.target).closest('form').submit();
    }
  }, 50),
  'submit .comment-form' : function (e) {
    const eventScope = this;

    addComment(e, 'add comments', '.create-comment', function (textarea, trimmedValue, anonData) {
      function addComment() {
        Comments.add(eventScope.id, trimmedValue);
        textarea.val('');
      }

      if (trimmedValue) {
        if (anonData) {
          userService.updateAnonymousUser(anonData, () => addComment());
        } else {
          addComment();
        }
      }
    });
  },
  'submit .reply-form' : function (e) {
    var eventScope = this.scope;

    // TODO: create a helper that creates anonymous users before the action if anon users are allowed

    addComment(e, 'add replies', '.create-reply', function (textarea, trimmedValue, anonData) {
      function addReply() {
        const id = eventScope._id || eventScope.documentId;

        Comments.reply(id, eventScope, trimmedValue);
        Comments.session.set('replyTo', null);
      }

      if (trimmedValue) {
        if (anonData) {
          userService.updateAnonymousUser(anonData, () => addReply());
        } else {
          addReply();
        }
      }
    });
  },
  'click .like-action' : function (event) {
    var eventScope = this;

    executeUserAction(event, 'like comments', function () {
      if (eventScope._id) {
        Comments.like(eventScope._id);
      } else if (eventScope.replyId) {
        Comments.likeReply(eventScope.documentId, eventScope);
      }
    });
  },
  'click .remove-action' : function () {
    const tplScope = Template.currentData(),
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
    let id = this._id || this.replyId;

    if (Comments.session.equals('replyTo', id)) {
      id = null;
    }

    Comments.session.set('replyTo', id);
  },
  'click .edit-action' : function (e) {
    const id = this._id || this.replyId;

    $('.comment-content').attr('contenteditable', false);
    $(e.target)
      .closest('.comment')
      .find('.comment-content[data-id="' + id + '"]')
      .attr('contenteditable', true)
    ;
    Comments.session.set('editingDocument', id);
  },
  'click .save-action' : function (e) {
    var id = this._id || this.replyId,
      contentBox = $(e.target).closest('.comment').find('.comment-content[data-id="' + id + '"]'),
      newContent = contentBox.text().trim();

    if (!newContent) {
      return;
    }

    contentBox.attr('contenteditable', false);
    Comments.session.set('editingDocument', '');

    if (this.content !== newContent) {
      contentBox.html('');
      if (this._id) {
        Comments.edit(id, newContent);
      } else if (this.replyId) {
        Comments.editReply(this.documentId, this, newContent);
      }
    }
  },
  'click .loadmore-action' : function () {
    Comments.session.set(
      this.id + '_currentLimit',
      Comments.session.get(this.id + '_currentLimit') + Comments.ui.config().loadMoreCount
    );
  }
});
