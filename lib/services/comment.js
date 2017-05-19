import { commentStatuses } from './comment-status'

const filterOutNotApprovedReplies = replies => replies
  .map(reply => {
    const isApproved = !reply.status || reply.status === commentStatuses.APPROVED

    if (!isApproved) return false

    if (reply.replies && reply.replies.length) {
      reply.replies = filterOutNotApprovedReplies(reply.replies)
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
  commentTransform: (d) => {
    const { replies } = d

    if (replies && replies.length) {
      // TODO: need to hook into the observeChanges callback
      //d.replies = filterOutNotApprovedReplies(replies)
    }

    return d
  },
}
