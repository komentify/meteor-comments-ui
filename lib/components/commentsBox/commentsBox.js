import userService from '../../services/user'

// TODO: put these helper funcs into single js files and import them here
/**
 * Call a meteor method with anonymous user id if there is as the last argument.
 *
 * @param {Function} call
 * @param {Array} callArgs
 */
const callWithAnonUserData = function (call, ...callArgs) {
  const anonData = userService.isAnonymous() ? userService.getUserData() : {}

  return call(...callArgs, anonData)
}

const prepareAddingComment = async function (event, type, selector) {
  const container = $(event.target).parent()

  if ("submit" === event.type) {
    event.preventDefault()
    await executeUserAction(event, type)

    const textarea = container.find(selector)
    const trimmedValue = textarea.val().trim()

    return { textarea, trimmedValue }
  }
}

/**
 * Run user actions, such as adding comments, replying etc.
 *
 * @param {Object} event
 * @param {String} type
 */
const executeUserAction = async function (event, type) {
  Comments.ui.setError('')

  if (userService.isAnonymous()) {
    const container = $(event.target).parent(),
      anonUserData = {
        username: (container.find('.anon-username').val() || ''),
        email: (container.find('.anon-email').val() || '')
      }

    return await userService.updateAnonymousUser(anonUserData)
  } else {
    return await new Promise(res => Comments.ui.callIfLoggedIn(type, res))
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

    const anonUserData = userService.isAnonymous() ? userService.getUserData() : {}

    handles.push(
      Meteor.subscribe('comments/reference',
        tplInstance.data.id,
        anonUserData,
        Comments.ui.getSorting(tplInstance.data.id),
        loadMoreCount,
        currentOffset,
      )
    )

    currentOffset += loadMoreCount
  }
})()

Comments.session.set('content', {})

Template.commentsBox.onCreated(function () {
  Comments.session.setDefault(this.data.id + '_sorting', Comments.config().sortingOptions[0].value)

  this.autorun(() => {
    callWithAnonUserData(Comments.getCount, this.data.id)
      .then(count => Comments.session.set(this.data.id + '_count', count))

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
  'submit .comment-form' : async function (e) {
    const eventScope = this

    const { textarea, trimmedValue } = await prepareAddingComment(
      e,
      'add comments',
      '.create-comment',
    )

    if (trimmedValue) await callWithAnonUserData(Comments.add, eventScope.id, trimmedValue)

    textarea.val('')
  },
  'submit .reply-form' : async function (e) {
    const eventScope = this.scope

    const { textarea, trimmedValue } = await prepareAddingComment(
      e,
      'add replies',
      '.create-reply',
    )

    if (trimmedValue) {
      const id = eventScope._id || eventScope.documentId

      await callWithAnonUserData(Comments.reply, id, eventScope.replyId, trimmedValue)

      textarea.val()
      Comments.session.set('replyTo', null)
    }
  },
  'click .like-action' : async function (event) {
    const eventScope = this

    await executeUserAction(event, 'like comments')

    if (eventScope._id) {
      await callWithAnonUserData(Comments.like, eventScope._id)
    } else if (eventScope.replyId) {
      await callWithAnonUserData(Comments.likeReply, eventScope.documentId, eventScope.replyId)
    }
  },
  'click .dislike-action': async function (event) {
    const eventScope = this

    await executeUserAction(event, 'dislike comments')

    if (eventScope._id) {
      await callWithAnonUserData(Comments.dislike, eventScope._id)
    } else if (eventScope.replyId) {
      await callWithAnonUserData(Comments.dislikeReply, eventScope.documentId, eventScope.replyId)
    }
  },
  'click .stars-action': async function (event) {
    const eventScope = this

    await executeUserAction(event, 'rate comments')

    const starRating = parseInt(
      $(event.target).parents('.stars-action').find('.stars-rating .current-rating').length,
      10
    )

    if (eventScope._id) {
      await callWithAnonUserData(Comments.star, eventScope._id, starRating)
    } else if (eventScope.replyId) {
      await callWithAnonUserData(Comments.starReply, eventScope.documentId, eventScope.replyId, starRating)
    }
  },
  'click .remove-action' : async function (event) {
    const tplScope = Template.currentData(),
      eventScope = this

    await executeUserAction(event, 'remove comments')

    if (eventScope._id) {
      await callWithAnonUserData(Comments.remove, eventScope._id)
      Comments.session.set(
        tplScope.id + '_count',
        (Comments.session.get(tplScope.id + '_count') - 1),
      )
    } else if (eventScope.replyId) {
      await callWithAnonUserData(Comments.removeReply, eventScope.documentId, eventScope.replyId)
    }
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
    const contentBox = $(e.target)
      .closest('.comment')
      .find('.comment-content[data-id="' + id + '"] .text-span')
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
        callWithAnonUserData(Comments.edit, id, newContent)
      } else if (this.replyId) {
        callWithAnonUserData(Comments.editReply, this.documentId, this.replyId, newContent)
      }
    }
  },
  'click .loadmore-action' : () => loadMoreDocuments(Template.instance())
})
