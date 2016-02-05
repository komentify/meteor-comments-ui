function getUserIdsByComment(comment) {
  var ids = [];

  ids.push(comment.userId);

  if (comment.replies) {
    _.each(comment.replies, function (reply) {
      ids = _.union(ids, getUserIdsByComment(reply));
    });
  }

  return ids;
}

Meteor.publishComposite('comments/reference', function (id, limit) {
  check(id, String);
  check(limit, Number);

  return {
    find: function () {
      return Comments._collection.find({ referenceId: id }, { limit: limit, sort: { createdAt: -1 } });
    },
    children: [{
      find: function (comment) {
        var userIds = getUserIdsByComment(comment);

        return Meteor.users.find({ _id: { $in: userIds } }, { fields: { profile: 1, emails: 1, username: 1 } });
      }
    }]
  };
});
