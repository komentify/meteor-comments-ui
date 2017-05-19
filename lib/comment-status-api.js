import { commentStatuses, validateCommentStatus } from './services/comment-status'
import { adjustReplyByReplyId } from './services/reply'
import comment from './services/comment'
import { noOptOptions } from './collections/methods/comments'

const approvedStatus = commentStatuses.APPROVED

// server only API
Comments.approve = (commentOrReplyId) => {
  check(commentOrReplyId, String)

  const doc = CommentsCollection.findOne(
    comment.commentOrReplySelector(commentOrReplyId),
  )

  if (doc) {
    if (doc._id === commentOrReplyId) {
      return CommentsCollection.update({ _id: doc._id }, { $set: { status: approvedStatus } })
    } else {
      adjustReplyByReplyId(
        doc.replies,
        commentOrReplyId,
        r => r.status = approvedStatus,
      )

      return CommentsCollection.update(
        { _id: doc._id },
        { $set: { replies: doc.replies } },
        noOptOptions,
      )
    }
  }
}

Comments.getAllForStatus = (status) => {
  check(status, String)
  validateCommentStatus(status)

  return CommentsCollection.find(
    { status },
    { sort: { createdAt: -1 } },
  )
}
