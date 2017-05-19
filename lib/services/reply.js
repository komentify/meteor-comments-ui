export const adjustReplyByReplyId = (replies, replyId, cb) => replies.forEach(reply => {
  if (reply.replyId === replyId) {
    cb(reply)
  } else if (reply.replies && reply.replies.length) {
    adjustReplyByReplyId(reply.replies, replyId, cb)
  }
})
