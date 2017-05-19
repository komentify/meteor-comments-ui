import mediaService from '../../services/media'
import userService from '../../services/user'
import commentService from '../../services/comment'
import { commentStatuses } from '../../services/comment-status'

export const noOptOptions = {
  validate: false,
  filter: false,
  getAutoValues: false,
  removeEmptyStrings: false
}

/**
 * Modify replies with a callback in a nested array.
 *
 * @param {Array} nestedArray
 * @param {Array} position Array of numbers with indexes throughout the reply tree.
 * @param {Function} callback
 */
function modifyNestedReplies(nestedArray, position, callback) {
  const currentPos = position.shift()

  if (nestedArray[currentPos]) {
    if (position.length && nestedArray[currentPos] && nestedArray[currentPos].replies) {
      modifyNestedReplies(nestedArray[currentPos].replies, position, callback)
    } else {
      callback(nestedArray, currentPos)
    }
  }
}

/**
 * Call a meteor method with anonymous user id if there is as the last argument.
 *
 * @param {String} methodName
 * @param {Array} methodArgs
 */
function callWithAnonUserData(methodName, ...methodArgs) {
  const anonUserData = userService.isAnonymous() ? userService.getUserData() : {}

  Meteor.apply(methodName, [...methodArgs, anonUserData], null, this.cb)
}

/**
 * Return a mongodb style field descriptor
 *
 * e.g "replies.0.replies.1" which points at the second reply of the first reply.
 *
 * @param {undefined|Array} position
 *
 * @return {String}
 */
function getMongoReplyFieldDescriptor(position) {
  if (!position) {
    return ''
  }

  const descriptorWithLeadingDot = _.reduce(position, function (descriptor, positionNumber) {
    return `${descriptor}replies.${positionNumber}.`
  }, '')

  return descriptorWithLeadingDot.substr(0, descriptorWithLeadingDot.length - 1)
}

const triggerEvent = (name, action, payload) => {
  const func = Comments.config().onEvent

  if (_.isFunction(func)) {
    func(name, action, payload)
  }
}

const getRatingScore = (doc) => {
  let score = CommentsCollection._calculateAverageRating(doc.starRatings)

  if (score ===  0) {
    score = doc.likes.length - (doc.dislikes && doc.dislikes.length ? doc.dislikes.length : 0)
  }

  return score
}

const updateRatingScoreOnDoc = (_id) => {
  CommentsCollection.update({ _id }, {
    $set: { ratingScore: getRatingScore(CommentsCollection.findOne(_id)) }
  })
}

const allowReplies = documentId => {
  const config = Comments.config()
  const referenceId = getReferenceIdByDocumentId(documentId)

  return config.allowReplies ? config.allowReplies(referenceId) : config.replies
}

export const getReferenceIdByDocumentId = documentId => {
  const doc = CommentsCollection.findOne({ _id: documentId }, { fields: { referenceId: 1 } })

  if (doc) {
    return doc.referenceId
  }
}

// TODO: add unit tests + good user testing (bootstrap, ionic and so on)!
Meteor.methods({
  'comments/add': function (referenceId, content, anonUserData) {
    check(referenceId, String)
    check(content, String)
    check(anonUserData, Object)

    userService.verifyAnonUserData(anonUserData, referenceId)

    const userId = this.userId || anonUserData._id

    content = content.trim()

    if (userId && content) {
      const doc = {
        referenceId,
        content,
        userId,
        createdAt: (new Date()),
        likes: [],
        dislikes: [],
        replies: [],
        isAnonymous: !!anonUserData._id,
        media: mediaService.getMediaFromContent(content)
      }

      const docId = CommentsCollection.insert(doc)

      triggerEvent('comment', 'add', Object.assign({}, doc, { _id: docId }))
    }
  },
  'comments/edit': function (documentId, newContent, anonUserData) {
    check(documentId, String)
    check(newContent, String)

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))
    const userId = this.userId || anonUserData._id

    newContent = newContent.trim()

    if (!userId || !newContent) {
      return
    }

    const setDoc = { content: newContent, likes: [], media: mediaService.getMediaFromContent(newContent), ratingScore: 0 }
    const findSelector = { _id: documentId, userId }

    CommentsCollection.update(
      findSelector,
      { $set: setDoc }
    )

    triggerEvent('comment', 'edit', Object.assign({}, setDoc, findSelector))
  },
  'comments/remove': function (documentId, anonUserData) {
    check(documentId, String)

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))
    const userId = this.userId || anonUserData._id

    const removeSelector = { _id: documentId, userId }

    const doc = CommentsCollection.findOne(removeSelector)

    CommentsCollection.remove(removeSelector)

    triggerEvent('comment', 'remove', doc)
  },
  'comments/like': function (documentId, anonUserData) {
    check (documentId, String)

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))
    const userId = this.userId || anonUserData._id

    if (!userId || !['likes', 'likes-and-dislikes'].includes(Comments.config().rating)) {
      return
    }

    const findSelector = { _id: documentId }

    const likedDoc = CommentsCollection.findOne({ _id: documentId, likes: { $in: [userId] } })

    if (likedDoc) {
      CommentsCollection.update(findSelector, { $pull: { likes: userId } }, noOptOptions)
    } else {
      CommentsCollection.update(findSelector, { $push: { likes: userId } }, noOptOptions)
    }

    updateRatingScoreOnDoc(documentId)

    triggerEvent('comment', 'like', Object.assign({}, likedDoc, findSelector, {
      ratedUserId: userId
    }))
  },
  'comments/dislike': function (documentId, anonUserData) {
    check (documentId, String)

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))
    const userId = this.userId || anonUserData._id

    if (!userId || !['likes', 'likes-and-dislikes'].includes(Comments.config().rating)) {
      return
    }

    const findSelector = { _id: documentId }

    const dislikedDoc = CommentsCollection.findOne({ _id: documentId, dislikes: { $in: [userId] } })

    if (dislikedDoc) {
      CommentsCollection.update(findSelector, { $pull: { dislikes: userId } }, noOptOptions)
    } else {
      CommentsCollection.update(findSelector, { $push: { dislikes: userId } }, noOptOptions)
    }

    updateRatingScoreOnDoc(documentId)

    triggerEvent('comment', 'dislike', Object.assign({}, dislikedDoc, findSelector, {
      ratedUserId: userId
    }))
  },
  'comments/star': function (documentId, starsCount, anonUserData) {
    check(documentId, String)
    check(starsCount, Number)

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))
    const userId = this.userId || anonUserData._id

    if (!userId || Comments.config().rating !== 'stars') {
      return
    }

    const findSelector = { _id: documentId }

    const starredDoc = CommentsCollection.findOne({ _id: documentId, 'starRatings.userId': userId })

    if (starredDoc) {
      CommentsCollection.update(findSelector, { $pull: { starRatings : { userId } } }, noOptOptions)
    }

    CommentsCollection.update(findSelector, { $push: { starRatings: { userId, rating: starsCount } } })

    updateRatingScoreOnDoc(documentId)

    triggerEvent('comment', 'star', Object.assign({}, starredDoc, findSelector, {
      ratedUserId: userId,
      rating: starsCount
    }))
  },
  'comments/reply/add': function (documentId, docScope, content, anonUserData) {
    check(documentId, String)
    check(docScope, Object)
    check(content, String)
    check(anonUserData, Object)

    const referenceId = getReferenceIdByDocumentId(documentId)

    userService.verifyAnonUserData(anonUserData, referenceId)

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    content = content.trim()

    if (!doc || !userId || !content || !allowReplies(documentId)) {
      return false
    }

    const reply = {
      replyId: Random.id(),
      content: content,
      userId: userId,
      createdAt: (new Date()),
      replies: [], likes: [],
      lastUpdatedAt: (new Date()),
      isAnonymous: !!anonUserData._id,
      status: Comments.config().defaultCommentStatus,
      media: mediaService.getMediaFromContent(content),
      ratingScore: 0
    }

    check(reply, CommentsCollection.schemas.ReplySchema)

    let fieldDescriptor = 'replies'

    if (docScope.position) {
      if (commentService.denyReply(docScope)) {
        throw new Meteor.Error('Cannot have more nesting than 4 levels');
      }

      fieldDescriptor = getMongoReplyFieldDescriptor(docScope.position) + '.replies'
    }

    const modifier = {
      $push: {
        [fieldDescriptor]: {
          $each: [reply],
          $position: 0
        }
      }
    }

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, modifier, noOptOptions)
    triggerEvent('reply', 'add', Object.assign({}, reply, findSelector, {
      userId,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/edit': function (documentId, docScope, newContent, anonUserData) {
    check(documentId, String)
    check(docScope, Object)
    check(newContent, String)

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne(documentId),
      userId = this.userId || anonUserData._id

    let reply = {}

    newContent = newContent.trim()

    if (!userId || !newContent || !allowReplies(documentId)) {
      return
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].userId === userId) {
        replies[index].content = newContent
        replies[index].likes = []
        replies[index].starRatings = []
        replies[index].ratingScore = 0
        replies[index].media = mediaService.getMediaFromContent(newContent)
        reply = replies[index]
      }
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies } }, noOptOptions)
    triggerEvent('reply', 'edit', Object.assign({}, findSelector, reply, {
      ratedUserId: userId,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/like': function (documentId, docScope, anonUserData) {
    check(documentId, String)
    check(docScope, Object)
    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    if (!userId
        || !allowReplies(documentId)
        || !['likes', 'likes-and-dislikes'].includes(Comments.config().rating)) {
      return false
    }

    let reply = {}

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].likes.indexOf(userId) > -1) {
        replies[index].likes.splice(replies[index].likes.indexOf(userId), 1)
      } else {
        replies[index].likes.push(userId)
      }

      reply = replies[index]
      replies[index].ratingScore = getRatingScore(replies[index])
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)
    triggerEvent('reply', 'like', Object.assign({}, reply, findSelector, {
      ratedUserId: userId,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/dislike': function (documentId, docScope, anonUserData) {
    check(documentId, String)
    check(docScope, Object)
    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    if (!userId
        || !allowReplies(documentId)
        || !['likes', 'likes-and-dislikes'].includes(Comments.config().rating)) {
      return false
    }

    let reply = {}

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (!replies[index].dislikes) {
        replies[index].dislikes = []
      }

      if (replies[index].dislikes.indexOf(userId) > -1) {
        replies[index].dislikes.splice(replies[index].dislikes.indexOf(userId), 1)
      } else {
        replies[index].dislikes.push(userId)
      }

      reply = replies[index]
      replies[index].ratingScore = getRatingScore(replies[index])
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)
    triggerEvent('reply', 'like', Object.assign({}, reply, findSelector, {
      ratedUserId: userId,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/star': function (documentId, docScope, starsCount, anonUserData) {
    check(documentId, String)
    check(docScope, Object)
    check(starsCount, Number)
    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    if (!userId || !allowReplies(documentId) || Comments.config().rating !== 'stars') {
      return false
    }

    let reply = {}

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      let starRatings = replies[index].starRatings

      if (!starRatings) {
        starRatings = []
      }

      let ratings = starRatings

      if (_.find(starRatings, rating => rating.userId === userId)) {
        ratings = _.filter(starRatings, rating => rating.userId !== userId)
      }

      ratings.push({ userId, rating: starsCount })
      replies[index].starRatings = ratings
      replies[index].ratingScore = getRatingScore(replies[index])
      reply = replies[index]
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)
    triggerEvent('reply', 'star', Object.assign({}, reply, findSelector, {
      ratedUserId: userId,
      rating: starsCount,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/remove': function (documentId, docScope, anonUserData) {
    check(documentId, String)
    check(docScope, Object)
    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    let reply = {}

    if (!userId || !allowReplies(documentId)) {
      return
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].userId === userId) {
        reply = replies[index]
        replies.splice(index, 1)
      }
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)
    triggerEvent('reply', 'remove', Object.assign({}, reply, findSelector, {
      rootUserId: doc.userId
    }))
  },
  'comments/count': function (referenceId, anonUserData) {
    check(referenceId, String)
    userService.verifyAnonUserData(anonUserData, referenceId)

    const userId = this.userId || anonUserData._id

    return CommentsCollection.find(
      commentService.getCommentsSelector(referenceId, userId),
    ).count()
  }
})

CommentsCollection.methods = {
  add: (referenceId, content, cb) => callWithAnonUserData.bind({ cb }, 'comments/add', referenceId, content)(),
  reply: (documentId, docScope, content, cb) => callWithAnonUserData.bind({ cb }, 'comments/reply/add', documentId, docScope, content)(),
  like: (documentId) => callWithAnonUserData('comments/like', documentId),
  likeReply: (documentId, docScope) => callWithAnonUserData('comments/reply/like', documentId, docScope),
  dislike: (documentId) => callWithAnonUserData('comments/dislike', documentId),
  dislikeReply: (documentId, docScope) => callWithAnonUserData('comments/reply/dislike', documentId, docScope),
  star: (documentId, starsCount) => callWithAnonUserData('comments/star', documentId, starsCount),
  starReply: (documentId, docScope, starsCount) => callWithAnonUserData('comments/reply/star', documentId, docScope, starsCount),
  edit: (documentId, newContent) => callWithAnonUserData('comments/edit', documentId, newContent),
  editReply: (documentId, docScope, content) => callWithAnonUserData('comments/reply/edit', documentId, docScope, content),
  remove: (documentId) => callWithAnonUserData('comments/remove', documentId),
  removeReply: (documentId, docScope) => callWithAnonUserData('comments/reply/remove', documentId, docScope),
  getCount: (id, cb) => callWithAnonUserData.bind({ cb }, 'comments/count', id)(),
}
