import { check, Match } from 'meteor/check'
import { Meteor } from 'meteor/meteor'

import mediaService from '../../services/media'
import userService from '../../services/user'
import commentService from '../../services/comment'
import { CommentsCollection } from '../comments'
import { noOptOptions } from '../../noOptOptions'
import { promisifyCall } from '../../lib/promisifyCall'
import {
  getMongoReplyFieldDescriptor,
  adjustReplyByReplyId,
} from '../../services/reply'

export { noOptOptions }

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

Meteor.methods({
  'comments/add'(referenceId, content, anonData) {
    return CommentsCollection.addComment(
      referenceId,
      content,
      this.userId,
      anonData,
    )
  },
  'comments/edit'(documentId, newContent, anonUserData) {
    return CommentsCollection.editComment(
      documentId,
      newContent,
      this.userId,
      anonUserData,
    )
  },
  'comments/remove'(documentId, anonUserData) {
    return CommentsCollection.removeComment(
      documentId,
      this.userId,
      anonUserData
    )
  },
  'comments/like'(documentId, anonUserData) {
    return CommentsCollection.likeComment(
      documentId,
      this.userId,
      anonUserData,
    )
  },
  'comments/dislike': function (documentId, anonUserData) {
    return CommentsCollection.dislikeComment(
      documentId,
      this.userId,
      anonUserData,
    )
  },
  'comments/star': function (documentId, starsCount, anonUserData) {
    return CommentsCollection.starComment(
      documentId,
      starsCount,
      this.userId,
      anonUserData,
    )
  },
  'comments/reply/add': function (documentId, replyId, content, anonUserData) {
    check(documentId, String)
    check(replyId, Match.Maybe(String))
    check(content, String)
    check(anonUserData, Match.Maybe(Object))
    anonUserData = anonUserData || {}

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

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

    if (replyId) {
      fieldDescriptor = getMongoReplyFieldDescriptor(doc.replies, replyId)

      if (fieldDescriptor) fieldDescriptor = `${fieldDescriptor}.replies`

      if (fieldDescriptor.split('replies.').length > 4) {
        throw new Meteor.Error('Cannot have more nesting than 4 levels')
      }
    }

    if (!fieldDescriptor) return null

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

    return reply
  },
  'comments/reply/edit': function (documentId, replyId, newContent, anonUserData) {
    check(documentId, String)
    check(replyId, Match.Maybe(String))
    check(newContent, String)
    check(anonUserData, Match.Maybe(Object))
    anonUserData = anonUserData || {}

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne(documentId),
      userId = this.userId || anonUserData._id

    let reply = {}

    newContent = newContent.trim()

    if (!userId || !newContent || !allowReplies(documentId)) {
      return null
    }

    adjustReplyByReplyId(doc.replies, replyId,reply => {
      if (reply.userId === userId) {
        reply.content = newContent
        reply.likes = []
        reply.starRatings = []
        reply.ratingScore = 0
        reply.media = mediaService.getMediaFromContent(newContent)
      }
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies } }, noOptOptions)
    triggerEvent('reply', 'edit', Object.assign({}, findSelector, reply, {
      ratedUserId: userId,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/like': function (documentId, replyId, anonUserData) {
    check(documentId, String)
    check(replyId, Match.Maybe(String))
    check(anonUserData, Match.Maybe(Object))
    anonUserData = anonUserData || {}

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    if (!userId
        || !allowReplies(documentId)
        || !['likes', 'likes-and-dislikes'].includes(Comments.config().rating)) {
      return false
    }

    let reply = {}

    adjustReplyByReplyId(doc.replies, replyId, (reply) => {
      if (reply.likes.indexOf(userId) > -1) {
        reply.likes.splice(reply.likes.indexOf(userId), 1)
      } else {
        reply.likes.push(userId)
      }

      reply.ratingScore = getRatingScore(reply)
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)
    triggerEvent('reply', 'like', Object.assign({}, reply, findSelector, {
      ratedUserId: userId,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/dislike': function (documentId, replyId, anonUserData) {
    check(documentId, String)
    check(replyId, Match.Maybe(String))
    check(anonUserData, Match.Maybe(Object))
    anonUserData = anonUserData || {}

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    if (!userId
        || !allowReplies(documentId)
        || !['likes', 'likes-and-dislikes'].includes(Comments.config().rating)) {
      return false
    }

    let reply = {}

    adjustReplyByReplyId(doc.replies, replyId, (reply) => {
      if (!reply.dislikes) {
        reply.dislikes = []
      }

      if (reply.dislikes.indexOf(userId) > -1) {
        reply.dislikes.splice(reply.dislikes.indexOf(userId), 1)
      } else {
        reply.dislikes.push(userId)
      }

      reply.ratingScore = getRatingScore(reply)
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)
    triggerEvent('reply', 'like', Object.assign({}, reply, findSelector, {
      ratedUserId: userId,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/star': function (documentId, replyId, starsCount, anonUserData) {
    check(documentId, String)
    check(replyId, Match.Maybe(String))
    check(starsCount, Number)
    check(anonUserData, Match.Maybe(Object))
    anonUserData = anonUserData || {}

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    if (!userId || !allowReplies(documentId) || Comments.config().rating !== 'stars') {
      return false
    }

    let reply = {}

    adjustReplyByReplyId(doc.replies, replyId, (reply) => {
      let starRatings = reply.starRatings

      if (!starRatings) {
        starRatings = []
      }

      let ratings = starRatings

      if (_.find(starRatings, rating => rating.userId === userId)) {
        ratings = _.filter(starRatings, rating => rating.userId !== userId)
      }

      ratings.push({ userId, rating: starsCount })

      reply.starRatings = ratings
      reply.ratingScore = getRatingScore(reply)
    })

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)
    triggerEvent('reply', 'star', Object.assign({}, reply, findSelector, {
      ratedUserId: userId,
      rating: starsCount,
      rootUserId: doc.userId
    }))
  },
  'comments/reply/remove': function (documentId, replyId, anonUserData) {
    check(documentId, String)
    check(replyId, Match.Maybe(String))
    check(anonUserData, Match.Maybe(Object))
    anonUserData = anonUserData || {}

    userService.verifyAnonUserData(anonUserData, getReferenceIdByDocumentId(documentId))

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id

    let reply = {}

    if (!userId || !allowReplies(documentId)) {
      return
    }

    const findSelector = { _id: documentId }

    CommentsCollection.removeReplyByReplyId(replyId, reply => reply.userId === userId)

    triggerEvent('reply', 'remove', Object.assign({}, reply, findSelector, {
      rootUserId: doc.userId,
    }))
  },
  'comments/count': function (referenceId, anonUserData) {
    check(referenceId, String)
    check(anonUserData, Match.Maybe(Object))
    anonUserData = anonUserData || {}

    let userId = ''

    try {
      userService.verifyAnonUserData(anonUserData, referenceId)
      userId = this.userId || anonUserData._id
    } catch (e) {}

    return CommentsCollection.find(
      commentService.getCommentsSelector(referenceId, userId),
    ).count()
  }
})

const promiseCall = (...callArgs) => promisifyCall(Meteor.call, ...callArgs)

export const add = (referenceId, content, anonData) =>
  promiseCall('comments/add', referenceId, content, anonData)

export const reply = (documentId, replyId, content, anonData) =>
  promiseCall('comments/reply/add', documentId, replyId, content, anonData)

export const edit = (documentId, newContent, anonData) =>
  promiseCall('comments/edit', documentId, newContent, anonData)

export const remove = (documentId, anonData) =>
  promiseCall('comments/remove', documentId, anonData)

export const like = (documentId, anonData) =>
  promiseCall('comments/like', documentId, anonData)

export const dislike = (documentId, anonData) =>
  promiseCall('comments/dislike', documentId, anonData)

export const star = (documentId, starsCount, anonData) =>
  promiseCall('comments/star', documentId, starsCount, anonData)

export const likeReply = (documentId, replyId, anonData) =>
  promiseCall('comments/reply/like', documentId, replyId, anonData)

export const dislikeReply = (documentId, replyId, anonData) =>
  promiseCall('comments/reply/dislike', documentId, replyId, anonData)

export const starReply = (documentId, replyId, starsCount, anonData) =>
  promiseCall('comments/reply/star', documentId, replyId, starsCount, anonData)

export const editReply = (documentId, replyId, content, anonData) =>
  promiseCall('comments/reply/edit', documentId, replyId, content, anonData)

export const removeReply = (documentId, replyId, anonData) =>
  promiseCall('comments/reply/remove', documentId, replyId, anonData)

export const getCount = (id, anonData) => promiseCall('comments/count', id, anonData)
