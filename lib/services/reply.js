export const adjustReplyByReplyId = (replies, replyId, cb) => replies.forEach(reply => {
  if (reply.replyId === replyId) {
    cb(reply)
  } else if (reply.replies && reply.replies.length) {
    adjustReplyByReplyId(reply.replies, replyId, cb)
  }
})

export const removeReplyByReplyId = (replies, replyId, removeIf) => replies.map(reply => {
  if (!removeIf) removeIf = () => true

  if (reply.replyId === replyId && removeIf(reply)) {
    return false
  } else if (reply.replies && reply.replies.length) {
    return {
      ...reply,
      replies: removeReplyByReplyId(reply.replies, replyId, removeIf),
    }
  }

  return reply
}).filter(reply => !!reply)


/**
 * Return a mongodb style field descriptor
 *
 * e.g "replies.0.replies.1" which points at the second reply of the first reply.
 *
 * @param {Array} replies
 * @param {String} replyId
 *
 * @return {String}
 */
export const getMongoReplyFieldDescriptor = (replies, replyId) => {
  return replies.reduce((acc, reply, replyIndex) => {
    if (acc.found) return acc

    if (reply.replyId === replyId) {
      return {
        found: true,
        descriptor: `replies.${replyIndex}`,
      }
    }

    const descriptor = getMongoReplyFieldDescriptor((reply.replies || []), replyId)

    if (descriptor) {
      return {
        found: true,
        descriptor: `replies.${replyIndex}.${descriptor}`,
      }
    }

    return acc
  }, { descriptor: '', found: false }).descriptor
}
