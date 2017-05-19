import { commentStatuses } from './comment-status'

const filterOutNotApprovedReplies = (replies, userId) => replies
  .map(reply => {
    const isApproved = !reply.status
      || reply.status === commentStatuses.APPROVED
      || reply.userId === userId

    if (!isApproved) return false

    if (reply.replies && reply.replies.length) {
      reply.replies = filterOutNotApprovedReplies(reply.replies, userId)
    }

    return reply
  })
  .filter(replyOrFalse => !!replyOrFalse)

const commentStatusSelector = userId => ({
  $or: [
    { userId },
    { status: '' },
    { status: { $exists: false } },
    { status: commentStatuses.APPROVED },
  ],
})

export default {
  denyReply: (scope) => scope.position && scope.position.length >= 4,
  commentStatusSelector,
  getCommentsSelector: (referenceId, userId) => ({
    referenceId,
    ...commentStatusSelector(userId),
  }),
  commentTransform(d, userId) {
    const { replies } = d

    if (replies && replies.length) {
      // TODO: how to filter out replies on observeChanges?
      d.replies = filterOutNotApprovedReplies(replies, userId)
    }

    return d
  },
}
