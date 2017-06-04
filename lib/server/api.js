import { CommentsCollection } from '../collections/comments'

Comments.removeReplyById = replyId => CommentsCollection.removeReplyByReplyId(replyId)
