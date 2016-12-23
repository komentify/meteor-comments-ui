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
  const limit = Comments.ui.config().limit

  let currentOffset = limit,
    handles = []

  function clearHandles() {
    _.forEach(handles, handle => handle.stop())
    currentOffset = limit
    handles = []
  }

  Template.commentsBox.onDestroyed(() => clearHandles())

  Comments.ui.clearHandles = clearHandles

  /**
   * @param {Object} tplInstance
   */
  return function (tplInstance) {
    const loadMoreCount = Comments.ui.config().loadMoreCount

    handles.push(
      Meteor.subscribe('comments/reference', tplInstance.data.id, Comments.ui.getSorting(tplInstance.data.id), loadMoreCount, currentOffset)
    )

    currentOffset += loadMoreCount
  }
})()

const getCaptchaData = (id, captchaEl) => {
  const config = Comments.config()

  if (!config.sweetCaptcha(id) || !userService.isAnonymous()) {
    return {}
  }

  const iframe = $(captchaEl[0].contentWindow.document)

  const key = iframe.find('input[name="sckey"]').val()
  const value = iframe.find('input[name="scvalue"]').val()

  return { key, value }
}

const captchaCallback = (data, successCb) => {
  return (err) => {
    Comments.ui.resetError()

    if (!err) {
      successCb()
      data && Comments.session.set('regenerateCaptcha', true)
    } else if (err.error === 'invalid-captcha') {
      Comments.ui.setError('Captcha wrong')
    }
  }
}

Comments.session.set('content', {})

Template.commentsBox.onCreated(function () {
  Comments.session.setDefault(this.data.id + '_sorting', Comments.config().sortingOptions[0].value)

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
  customBoxTemplate() {
    return defaultCommentHelpers.getCustomTemplate('boxTemplate', 'commentsBox', this)
  },
  customHeaderTemplate() {
    return defaultCommentHelpers.getCustomTemplate('headerTemplate', 'commentsBox', this)
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
  },
  commentErrorMessage() {
    const error = Comments.session.get('commentError')

    return defaultCommentHelpers.take({
      hash: {
        key: error,
        'default': error,
      },
    })
  },
  youNeedToLogin() {
    let title = defaultCommentHelpers.take({
      hash: {
        key: 'you-need-to-login',
        'default': 'You need to login to'
      }
    })

    const defLoginAction = Comments.session.get('loginAction')

    const loginAction = defaultCommentHelpers.take({
      hash: {
        key: defLoginAction,
        'default': defLoginAction
      }
    })

    return `${title} ${loginAction}`
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
      function actuallyAddComment() {
        const captchaData = getCaptchaData(eventScope.id, $(e.target).find('.sweet-captcha'))

        Comments.add(
          eventScope.id,
          trimmedValue,
          captchaData,
          captchaCallback(captchaData, () => textarea.val(''))
        )
      }

      if (trimmedValue) {
        if (anonData && anonData.username && anonData.email) {
          userService.updateAnonymousUser(anonData, () => actuallyAddComment())
        } else {
          actuallyAddComment()
        }
      }
    })
  },
  'submit .reply-form' : function (e) {
    var eventScope = this.scope

    addComment(e, 'add replies', '.create-reply', function (textarea, trimmedValue, anonData) {
      function addReply() {
        const id = eventScope._id || eventScope.documentId

        const captchaData = getCaptchaData(
          eventScope.referenceId,
          $(e.target).find('.sweet-captcha')
        )

        Comments.reply(
          id,
          eventScope,
          trimmedValue,
          captchaData,
          captchaCallback(captchaData, () => {
            Comments.session.set('replyTo', null)
          })
        )
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
  'click .dislike-action': function (event) {
    const eventScope = this

    executeUserAction(event, 'dislike comments', function () {
      if (eventScope._id) {
        Comments.dislike(eventScope._id)
      } else if (eventScope.replyId) {
        Comments.dislikeReply(eventScope.documentId, eventScope)
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

    $('#editComment').remove()

    $(e.target)
      .closest('.comment')
      .find('.comment-content[data-id="' + id + '"] .text-span')
      .hide()
      .parent()
      .append(`
      <div class="field" id="editComment">
        <textarea class="edit-comment">${this.content}</textarea>
      </div>`)

    Comments.session.set('editingDocument', id)
  },
  'click .save-action' : function (e) {
    const id = this._id || this.replyId
    const contentBox = $(e.target).closest('.comment').find('.comment-content[data-id="' + id + '"] .text-span')
    const editCommentWrapper = $('#editComment')
    const newContent = editCommentWrapper.find('textarea').val().trim()

    if (!newContent) {
      return null
    }

    editCommentWrapper.remove()
    contentBox.show()

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
