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
  commentStatusSelector,
  filterOutNotApprovedReplies,
  commentOrReplySelector: (fieldValue, field = 'replyId') => ({
    $or: [
      { [field === 'replyId' ? '_id' : field]: fieldValue },
      { [`replies.${field}`]: fieldValue },
      { [`replies.replies.${field}`]: fieldValue },
      { [`replies.replies.replies.${field}`]: fieldValue },
      { [`replies.replies.replies.replies.${field}`]: fieldValue },
    ],
  }),
  getCommentsSelector: (referenceId, userId, canSeePending) => ({
    referenceId,
    ...(canSeePending ? {} : commentStatusSelector(userId)),
  }),
  commentTransform(d, userId) {
    const { replies } = d

    if (replies && replies.length) {
      d.replies = filterOutNotApprovedReplies(replies, userId)
    }

    return d
  },
}
