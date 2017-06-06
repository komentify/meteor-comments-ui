import { check, Maybe } from 'meteor/check'

import comment from '../services/comment'
import userService from '../services/user'
import mediaService from '../services/media'
import { removeReplyByReplyId } from '../services/reply'
import { getReferenceIdByDocumentId } from './methods/comments'
import { noOptOptions } from '../noOptOptions'

const triggerEvent = (name, action, payload) => {
  const func = Comments.config().onEvent

  if (func) func(name, action, payload)
}

const throwOperationError = (action) => {
  throw new Error(`Could not ${action}`)
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

export const addCollectionMethods = (CommentsCollection) => {
  CommentsCollection.addComment = (referenceId, content, userId, anonData) => {
    const data = verifyUserData(userId, anonData, referenceId)
    const { anonUserData } = data
    userId = data.userId

    check(referenceId, String)
    content = verifyContent(content)

    if (!content || !userId) {
      throwOperationError('add comment')
    }

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

    CommentsCollection.update(
      findSelector,
      { $set: setDoc }
    )

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
