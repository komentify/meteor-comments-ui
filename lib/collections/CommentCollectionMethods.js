import { check, Maybe } from 'meteor/check'

import comment from '../services/comment'
import userService from '../services/user'
import mediaService from '../services/media'
import { removeReplyByReplyId } from '../services/reply'
import { getReferenceIdByDocumentId } from './methods/comments'
import { noOptOptions } from '../noOptOptions'

// TODO: put all these funcs into lib / helper / util libraries that make them re-usable
const triggerEvent = (name, action, payload) => {
  const func = Comments.config().onEvent

  if (func) func(name, action, payload)
}

const verifyContent = content => {
  check(content, String)
  return content.trim()
}

const verifyUserData = (meteorUserId, anonUserData, referenceId) => {
  check(anonUserData, Match.Maybe(Object))
  anonUserData = anonUserData || {}

  userService.verifyAnonUserData(anonUserData, referenceId)

  return { anonUserData, userId: (meteorUserId || anonUserData._id) }
}

/**
 * Add root level methods to the collection.
 *
 * @param {Object} CommentsCollection
 */
export const addCollectionMethods = (CommentsCollection) => {
  const getRatingScore = (doc) => {
    let score = CommentsCollection._calculateAverageRating(doc.starRatings)

    if (score ===  0) {
      score = doc.likes.length - (doc.dislikes && doc.dislikes.length ? doc.dislikes.length : 0)
    }

    return score
  }

  const updateRatingScoreOnDoc = (_id) => CommentsCollection.update({ _id }, {
    $set: { ratingScore: getRatingScore(CommentsCollection.findOne(_id)) },
  })

  CommentsCollection.addComment = (referenceId, content, userId, anonData) => {
    const data = verifyUserData(userId, anonData, referenceId)
    const { anonUserData } = data
    userId = data.userId

    check(referenceId, String)
    content = verifyContent(content)

    if (!content || !userId) return null

    const doc = {
      referenceId,
      content,
      userId,
      isAnonymous: !!anonUserData._id,
      createdAt: (new Date()),
      likes: [],
      dislikes: [],
      replies: [],
      media: mediaService.getMediaFromContent(content)
    }

    const docId = CommentsCollection.insert(doc)
    const docWithId = Object.assign({}, doc, { _id: docId })

    if (docId) triggerEvent('comment', 'add', docWithId)

    return docWithId
  }

  CommentsCollection.editComment = (documentId, newContent, userId, anonUserData) => {
    check(documentId, String)
    newContent = verifyContent(newContent)

    userId = verifyUserData(userId, anonUserData, getReferenceIdByDocumentId(documentId)).userId

    if (!userId || !newContent) return null

    const setDoc = {
      content: newContent,
      likes: [],
      media: mediaService.getMediaFromContent(newContent),
      ratingScore: 0,
    }

    const findSelector = { _id: documentId, userId }

    CommentsCollection.update(findSelector, { $set: setDoc })

    const doc = Object.assign({}, setDoc, findSelector)

    if (doc) triggerEvent('comment', 'edit', doc)

    return doc
  }

  CommentsCollection.removeComment = (documentId, userId, anonUserData) => {
    check(documentId, String)

    userId = verifyUserData(userId, anonUserData, getReferenceIdByDocumentId(documentId)).userId

    const removeSelector = { _id: documentId, userId }

    const doc = CommentsCollection.findOne(removeSelector)

    if (CommentsCollection.remove(removeSelector)) triggerEvent('comment', 'remove', doc)

    return doc
  }

  CommentsCollection.likeComment = (documentId, userId, anonUserData) => {
    check(documentId, String)

    userId = verifyUserData(userId, anonUserData, getReferenceIdByDocumentId(documentId)).userId

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
  }

  CommentsCollection.dislikeComment = (documentId, userId, anonUserData) => {
    check(documentId, String)
    userId = verifyUserData(userId, anonUserData, getReferenceIdByDocumentId(documentId)).userId

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
  }

  CommentsCollection.starComment = (documentId, starsCount, userId, anonUserData) => {
    check(documentId, String)
    check(starsCount, Number)
    userId = verifyUserData(userId, anonUserData, getReferenceIdByDocumentId(documentId)).userId

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
  }

  CommentsCollection.findPublic = (selector = {}, userId, opts = {}) => {
    if (!opts.sort) opts.sort = { createdAt: -1 }

    return CommentsCollection.find({
      ...selector,
      ...comment.commentStatusSelector(userId)
    }, opts)
  }

  CommentsCollection.findOnePublic = (_id, userId) => CommentsCollection.findOne({
    _id,
    ...comment.commentStatusSelector(userId)
  })

  CommentsCollection.removeReplyByReplyId = (replyId, removeIf) => {
    const doc = CommentsCollection.findOne(
      comment.commentOrReplySelector(replyId),
    )

    if (doc) {
      doc.replies = removeReplyByReplyId(doc.replies, replyId, removeIf)

      return CommentsCollection.update(
        { _id: doc._id },
        { $set: { replies: doc.replies } },
        noOptOptions,
      )
    }
  }
}
