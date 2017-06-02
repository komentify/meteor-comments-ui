import comment from '../services/comment'
import { CommentsCollection } from '../collections/comments'
import { removeReplyByReplyId } from '../services/reply'
import { noOptOptions } from '../collections/methods/comments'

Comments.removeReplyById = replyId => {
  const doc = CommentsCollection.findOne(
    comment.commentOrReplySelector(replyId),
  )

  if (doc) {
    doc.replies = removeReplyByReplyId(doc.replies, replyId)

    return CommentsCollection.update(
      { _id: doc._id },
      { $set: { replies: doc.replies } },
      noOptOptions,
    )
  }
}
