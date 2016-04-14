import userService from '../../services/user'

/**
 * Add a comment, reply if the user has permission to do so.
 *
 * @param {Object} event
 * @param {String} type
 * @param {String} selector
 * @param {Function} callback
 */
const addComment = function (event, type, selector, callback) {
  const container = $(event.target).parent()

  if ("submit" === event.type) {
    event.preventDefault()
    executeUserAction(event, type, function (anonymousData) {
      var textarea = container.find(selector),
        value = textarea.val().trim()

      callback(textarea, value, anonymousData)
    })
  }
}

/**
 * Run user actions, such as adding comments, replying etc.
 *
 * @param {Object} event
 * @param {String} type
 * @param {Function} callback
 */
const executeUserAction = function (event, type, callback) {
  if (userService.isAnonymous()) {
    const container = $(event.target).parent(),
      anonUserData = {
        username: (container.find('.anon-username').val() || ''),
        email: (container.find('.anon-email').val() || '')
      }

    userService.updateAnonymousUser(anonUserData, callback)
  } else {
    Comments.ui.callIfLoggedIn(type, callback)
  }
}

const loadMoreDocuments = (function () {
  // hotfix for apps running on v1.2.1
  if (!Comments.ui || !Comments.ui.config) {
    return null
  }

  const limit = Comments.ui.config().limit

  let currentOffset = limit,
    handles = []

  Template.commentsBox.onDestroyed(() => {
    _.forEach(handles, handle => handle.stop())
    currentOffset = limit
    handles = []
  })

  /**
   * @param {Object} tplInstance
   */
  return function (tplInstance) {
    const loadMoreCount = Comments.ui.config().loadMoreCount

    handles.push(
      Meteor.subscribe('comments/reference', tplInstance.data.id, loadMoreCount, currentOffset)
    )

    currentOffset += loadMoreCount
  }
})()

Comments.session.set('content', {})

Template.commentsBox.onCreated(function () {
  Avatar.setOptions({
    defaultImageUrl: Comments.ui.config().defaultAvatar
  })

  this.subscribe('comments/reference', this.data.id, Comments.ui.config().limit)

  this.autorun(() => {
    Comments.getCount(this.data.id, (err, count) => {
      Comments.session.set(this.data.id + '_count', count)
    })

    if (userService.isAnonymous()) {
      const userData = userService.getUserData()

      Comments.session.set('loginAction', '')

      userData._id && userData.salt && this.subscribe('comments/anonymous', userData)
    }
  })

  this.autorun(() => {
    if(Meteor.userId()) {
      Comments.session.set('loginAction', '')
    }
  })
})

Template.commentsBox.helpers(_.extend(defaultCommentHelpers, {
  comment() {
    return Comments.get(this.id)
  },
  customBoxTemplate() {
    return defaultCommentHelpers.getCustomTemplate('boxTemplate', this)
  },
  customHeaderTemplate() {
    return defaultCommentHelpers.getCustomTemplate('headerTemplate', this)
  },
  customLoadingTemplate() {
    return defaultCommentHelpers.getCustomTemplate('loadingTemplate', this)
  },
  commentsBoxTitle() {
    let title = defaultCommentHelpers.take({
      hash: {
        key: 'title',
        'default': 'Comments'
      }
    })

    const data = Template.instance().data

    if (data && data.title) {
      title =  `${title} for ${data.title}`
    }

    return title
  }
}))

Template.commentsBox.events({
  'keydown .create-comment, keydown .create-reply': _.debounce((e) => {
    if (e.originalEvent instanceof KeyboardEvent && e.keyCode === 13 && e.ctrlKey) {
      e.preventDefault()
      $(e.target).closest('form').find('.submit.button').click()
    }
  }, 50),
  'keydown .anon-email, keydown .anon-username': (e) => {
    if (e.keyCode === 13) {
      e.preventDefault()
    }
  },
  'submit .comment-form' : function (e) {
    const eventScope = this

    addComment(e, 'add comments', '.create-comment', function (textarea, trimmedValue, anonData) {
      function addComment() {
        Comments.add(eventScope.id, trimmedValue)
        textarea.val('')
      }

      if (trimmedValue) {
        if (anonData) {
          if (anonData.username && anonData.email) {
            userService.updateAnonymousUser(anonData, () => addComment())
          }
        } else {
          addComment()
        }
      }
    })
  },
  'submit .reply-form' : function (e) {
    var eventScope = this.scope

    addComment(e, 'add replies', '.create-reply', function (textarea, trimmedValue, anonData) {
      function addReply() {
        const id = eventScope._id || eventScope.documentId

        Comments.reply(id, eventScope, trimmedValue)
        Comments.session.set('replyTo', null)
      }

      if (trimmedValue) {
        if (anonData) {
          if (anonData.username && anonData.email) {
            userService.updateAnonymousUser(anonData, () => addReply())
          }
        } else {
          addReply()
        }
      }
    })
  },
  'click .like-action' : function (event) {
    const eventScope = this

    executeUserAction(event, 'like comments', function () {
      if (eventScope._id) {
        Comments.like(eventScope._id)
      } else if (eventScope.replyId) {
        Comments.likeReply(eventScope.documentId, eventScope)
      }
    })
  },
  'click .stars-action': function (event) {
    const eventScope = this

    executeUserAction(event, 'rate comments', function () {
      const starRating = parseInt(
        $(event.target).parents('.stars-action').find('.stars-rating .current-rating').length,
        10
      )

      if (eventScope._id) {
        Comments.star(eventScope._id, starRating)
      } else if (eventScope.replyId) {
        Comments.starReply(eventScope.documentId, eventScope, starRating)
      }
    })
  },
  'click .remove-action' : function () {
    const tplScope = Template.currentData(),
      eventScope = this

    Comments.ui.callIfLoggedIn('remove comments', function () {
      if (eventScope._id) {
        Comments.remove(eventScope._id)
        Comments.session.set(tplScope.id + '_count', (Comments.session.get(tplScope.id + '_count') - 1))
      } else if (eventScope.replyId) {
        Comments.removeReply(eventScope.documentId, eventScope)
      }
    })
  },
  'click .reply-action': function () {
    let id = this._id || this.replyId

    if (Comments.session.equals('replyTo', id)) {
      id = null
    }

    Comments.session.set('replyTo', id)
  },
  'click .edit-action' : function (e) {
    const id = this._id || this.replyId

    $('.comment-content .text-span').attr('contenteditable', false)
    $(e.target)
      .closest('.comment')
      .find('.comment-content[data-id="' + id + '"] .text-span')
      .html(this.content)
      .attr('contenteditable', true)


    Comments.session.set('editingDocument', id)
  },
  'click .save-action' : function (e) {
    var id = this._id || this.replyId,
      contentBox = $(e.target).closest('.comment').find('.comment-content[data-id="' + id + '"] .text-span'),
      newContent = contentBox.text().trim()

    if (!newContent) {
      return
    }

    contentBox.attr('contenteditable', false)
    Comments.session.set('editingDocument', '')

    if (this.content !== newContent) {
      contentBox.html('')
      if (this._id) {
        Comments.edit(id, newContent)
      } else if (this.replyId) {
        Comments.editReply(this.documentId, this, newContent)
      }
    }
  },
  'click .loadmore-action' : () => loadMoreDocuments(Template.instance())
})
