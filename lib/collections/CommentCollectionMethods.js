import comment from '../services/comment'
import { removeReplyByReplyId } from '../services/reply'
import { noOptOptions } from '../noOptOptions'

export const addCollectionMethods = (CommentsCollection) => {
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
