import { check, Maybe } from 'meteor/check'

import { triggerEvent } from '../lib/triggerEvent'
import { getReferenceIdByDocumentId } from './methods/comments'
import { verifyUserData, verifyContent } from '../lib/verifyData'
import mediaService from '../services/media'
import createRatingScoreService from '../lib/ratingScore'

import { noOptOptions } from '../lib/noOptOptions'
import {
  getMongoReplyFieldDescriptor,
  adjustReplyByReplyId,
  allowReplies,
} from '../services/reply'

/**
 * Add reply methods to the collection.
 *
 * @param {Object} CommentsCollection
 */
export const addReplyMethods = (CommentsCollection) => {
  const { getRatingScore } = createRatingScoreService(CommentsCollection)

  const updateCommentForReplyAction = (documentId, replyId, userId, anonData, action, adjustCallback) => {
    check(documentId, String)
    check(replyId, Match.Maybe(String))

    const referenceId = getReferenceIdByDocumentId(documentId)

    userId = verifyUserData(userId, anonData, referenceId).userId

    const doc = CommentsCollection.findOne({ _id: documentId })

    const canDoAction = action === 'star'
      ? Comments.config().rating === 'stars'
      : ['likes', 'likes-and-dislikes'].includes(Comments.config().rating)

    if (!userId
      || !allowReplies(referenceId)
      || !canDoAction) {
      return false
    }

    let reply = {}

    adjustReplyByReplyId(doc.replies, replyId, adjustCallback)

    const findSelector = { _id: documentId }

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions)

    triggerEvent('reply', action, Object.assign({}, reply, findSelector, {
      ratedUserId: userId,
      rootUserId: doc.userId
    }))

    return doc
  }

  CommentsCollection.addReply = (documentId, replyId, content, userId, anonData) => {
    check(documentId, String)
    check(replyId, Match.Maybe(String))

    const referenceId = getReferenceIdByDocumentId(documentId)
    const data = verifyUserData(userId, anonData, referenceId)
    const { anonUserData } = data
    userId = data.userId

    content = verifyContent(content)

    const doc = CommentsCollection.findOne({ _id: documentId })

    if (!doc || !userId || !content || !allowReplies(referenceId)) {
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
  }

  CommentsCollection.editReply = (documentId, replyId, newContent, userId, anonData) => {
    check(documentId, String)
    check(replyId, Match.Maybe(String))

    const referenceId = getReferenceIdByDocumentId(documentId)

    newContent = verifyContent(newContent)
    userId = verifyUserData(userId, anonData, referenceId).userId

    const doc = CommentsCollection.findOne(documentId)

    let reply = {}

    if (!userId || !newContent || !allowReplies(referenceId)) {
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

    return doc
  }

  CommentsCollection.likeReply = (documentId, replyId, userId, anonData) => {
    return updateCommentForReplyAction(documentId, replyId, userId, anonData, 'like', (reply) => {
      if (reply.likes.indexOf(userId) > -1) {
        reply.likes.splice(reply.likes.indexOf(userId), 1)
      } else {
        reply.likes.push(userId)
      }

      reply.ratingScore = getRatingScore(reply)
    })
  }

  CommentsCollection.dislikeReply = (documentId, replyId, userId, anonData) => {
    return updateCommentForReplyAction(documentId, replyId, userId, anonData, 'dislike', (reply) => {
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
  }

  CommentsCollection.starReply = (documentId, replyId, starsCount, userId, anonData) => {
    check(starsCount, Number)

    return updateCommentForReplyAction(documentId, replyId, userId, anonData, 'star', (reply) => {
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
  }

  CommentsCollection.removeReply = (documentId, replyId, userId, anonData) => {
    check(documentId, String)
    check(replyId, Match.Maybe(String))

    const referenceId = getReferenceIdByDocumentId(documentId)

    userId = verifyUserData(userId, anonData, referenceId).userId

    const doc = CommentsCollection.findOne({ _id: documentId })

    if (!userId || !allowReplies(referenceId)) {
      return
    }

    const findSelector = { _id: documentId }

    CommentsCollection.removeReplyByReplyId(replyId, reply => reply.userId === userId)

    triggerEvent('reply', 'remove', Object.assign({}, findSelector, {
      rootUserId: doc.userId,
    }))

    return doc
  }
}
