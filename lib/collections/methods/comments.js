import { check, Match } from 'meteor/check'
import { Meteor } from 'meteor/meteor'

import { CommentsCollection } from '../comments'
import { noOptOptions } from '../../lib/noOptOptions'
import { promisifyCall } from '../../lib/promisifyCall'

export { noOptOptions }

export const getReferenceIdByDocumentId = documentId => {
  const doc = CommentsCollection.findOne({ _id: documentId }, { fields: { referenceId: 1 } })

  if (doc) {
    return doc.referenceId
  }
}

Meteor.methods({
  'comments/add'(referenceId, content, anonData) {
    return CommentsCollection.addComment(referenceId, content, this.userId, anonData)
  },
  'comments/edit'(documentId, newContent, anonUserData) {
    return CommentsCollection.editComment(documentId, newContent, this.userId, anonUserData)
  },
  'comments/remove'(documentId, anonUserData) {
    return CommentsCollection.removeComment(documentId, this.userId, anonUserData)
  },
  'comments/like'(documentId, anonUserData) {
    return CommentsCollection.likeComment(documentId, this.userId, anonUserData)
  },
  'comments/dislike': function (documentId, anonUserData) {
    return CommentsCollection.dislikeComment(documentId, this.userId, anonUserData)
  },
  'comments/star': function (documentId, starsCount, anonUserData) {
    return CommentsCollection.starComment(documentId, starsCount, this.userId, anonUserData)
  },
  'comments/reply/add': function (documentId, replyId, content, anonUserData) {
    return CommentsCollection.addReply(documentId, replyId, content, this.userId, anonUserData)
  },
  'comments/reply/edit': function (documentId, replyId, newContent, anonUserData) {
    return CommentsCollection.editReply(documentId, replyId, newContent, this.userId, anonUserData)
  },
  'comments/reply/like': function (documentId, replyId, anonUserData) {
    return CommentsCollection.likeReply(documentId, replyId, this.userId, anonUserData)
  },
  'comments/reply/dislike': function (documentId, replyId, anonUserData) {
    return CommentsCollection.dislikeReply(documentId, replyId, this.userId, anonUserData)
  },
  'comments/reply/star': function (documentId, replyId, starsCount, anonUserData) {
    return CommentsCollection.starReply(documentId, replyId, starsCount, this.userId, anonUserData)
  },
  'comments/reply/remove': function (documentId, replyId, anonUserData) {
    return CommentsCollection.removeReply(documentId, replyId, this.userId, anonUserData)
  },
  'comments/count': function (referenceId, anonUserData) {
    return CommentsCollection.getCountForReferenceId(referenceId, this.userId, anonUserData)
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
