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

Meteor.publishComposite('comments/reference', function (id, sorting, limit, skip = 0) {
  check(id, String)
  check(sorting, String)
  check(limit, Number)
  check(skip, Number)

  return {
    find: () => Comments._collection.find(
      { referenceId: id },
      { limit, skip, sort: Comments.getSortOption(sorting) }
    ),
    children: [{
      find(comment) {
        const userIds = getUserIdsByComment(comment)

        return Meteor.users.find(
          { _id: { $in: userIds } },
          { fields: Comments.config().publishUserFields }
        )
      }
    }, {
      find(comment) {
        const userIds = getUserIdsByComment(comment)

        return AnonymousUserCollection.find(
          { _id: { $in: userIds } },
          {
            fields: { salt: 0, email: 0, anonIp: 0 }
          }
        )
      }
    }]
  }
})
