export const adjustReplyByReplyId = (replies, replyId, cb) => replies.forEach(reply => {
  if (reply.replyId === replyId) {
    cb(reply)
  } else if (reply.replies && reply.replies.length) {
    adjustReplyByReplyId(reply.replies, replyId, cb)
  }
})

export const removeReplyByReplyId = (replies, replyId) => replies.map(reply => {
  if (reply.replyId === replyId) {
    return false
  } else if (reply.replies && reply.replies.length) {
    reply.replies = removeReplyByReplyId(reply.replies, replyId)
  }

  return reply
}).filter(reply => !!reply)
