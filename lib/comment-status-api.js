import { commentStatuses } from './services/comment-status'

const approvedStatus = commentStatuses.APPROVED

// server only API
Comments.approve = (_id) => {
  check(_id, String)

  return CommentsCollection.update(
    { _id },
    { $set: { status: approvedStatus } },
  )
}

Comments.getAllForStatus = (status) => {
  check(status, String)

  return CommentsCollection.find(
    { status },
    { sort: { createdAt: -1 } },
  )
}
