import userService from '../services/user'
import comment from '../services/comment'

/**
 * Return user ids by the given comment.
 *
 * @param {Object} comment
 *
 * @returns {Array}
 */
function getUserIdsByComment(comment) {
  var ids = []

  ids.push(comment.userId)

  if (comment.replies) {
    _.each(comment.replies, function (reply) {
      ids = _.union(ids, getUserIdsByComment(reply))
    })
  }

  return ids
}

Meteor.publish('comments/anonymous', function (data) {
  check(data, {
    _id: String,
    salt: String
  })

  return AnonymousUserCollection.find(data, {
    fields: { salt: 0, anonIp: 0 }
  })
})

const getCompositeCommentCursor = (rootCursor) => ({
  find: () => rootCursor,
  children: [
    {
      find(comment) {
        const userIds = getUserIdsByComment(comment)

        return Meteor.users.find(
          { _id: { $in: userIds } },
          { fields: Comments.config().publishUserFields }
        )
      }
    },
    {
      find(comment) {
        const userIds = getUserIdsByComment(comment)

        return AnonymousUserCollection.find(
          { _id: { $in: userIds } },
          {
            fields: { salt: 0, email: 0, anonIp: 0 }
          }
        )
      }
    }
  ]
})

Meteor.publishComposite('comments/reference', function (id, anonUserData, sorting, limit, skip = 0) {
  check(id, String)
  check(sorting, String)
  check(limit, Number)
  check(skip, Number)

  userService.verifyAnonUserData(anonUserData, id)
  const userId = this.userId || anonUserData._id

  return getCompositeCommentCursor(Comments._collection.find(
    comment.getCommentsSelector(id, userId),
    {
      limit,
      skip,
      sort: Comments.getSortOption(sorting),
      transform(d) {
        return comment.commentTransform(d, userId)
      },
    }
  ))
})

Meteor.publishComposite('comments/single', function (commentOrReplyId, anonUserData) {
  check(commentOrReplyId, String)

  userService.verifyAnonUserData(anonUserData, null, true)

  const userId = this.userId || anonUserData._id

  return getCompositeCommentCursor(
    Comments._collection.find({
      $and: [
        comment.commentOrReplySelector(commentOrReplyId),
        comment.commentStatusSelector(userId),
      ],
    }, { transform: d => comment.commentTransform(d, userId) })
  )
})
