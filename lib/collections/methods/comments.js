const noOptOptions = {
  validate: false,
  filter: false,
  getAutoValues: false,
  removeEmptyStrings: false
};

/**
 * Modify replies with a callback in a nested array.
 *
 * @param {Array} nestedArray
 * @param {Array} position Array of numbers with indexes throughout the reply tree.
 * @param {Function} callback
 */
function modifyNestedReplies(nestedArray, position, callback) {
  var currentPos = position.shift();

  if (nestedArray[currentPos]) {
    if (position.length && nestedArray[currentPos] && nestedArray[currentPos].replies) {
      modifyNestedReplies(nestedArray[currentPos].replies, position, callback);
    } else {
      callback(nestedArray, currentPos);
    }
  }
}

/**
 * Call a meteor method with anonymous user id if there is as the last argument.
 *
 * @param {String} methodName
 * @param {Array} methodArgs
 */
function callWithAnonUserId(methodName, ...methodArgs) {
  const anonUserId = userService.isAnonymous() ? userService.getUserId() : '';
  Meteor.apply(methodName, [...methodArgs, anonUserId]);
}

Meteor.methods({
  'comments/add': function (referenceId, content, anonUserId) {
    check(referenceId, String);
    check(content, String);
    check(anonUserId, Match.Optional(anonUserId));

    const userId = this.userId || anonUserId;

    content = content.trim();

    if (userId && content) {
      CommentsCollection.insert(
        { referenceId, content, userId, createdAt: (new Date()), likes: [], replies: [], isAnonymous: !!anonUserId }
      );
    }
  },
  'comments/edit': function (documentId, newContent, anonUserId) {
    check(documentId, String);
    check(newContent, String);
    check(anonUserId, String);

    const userId = this.userId || anonUserId;

    newContent = newContent.trim();

    if (!userId || !newContent) {
      return;
    }

    CommentsCollection.update(
      { _id: documentId, userId },
      { $set: { content: newContent, likes: [], image: mediaService.getImageFromContent(newContent) } }
    );
  },
  'comments/remove': function (documentId, anonUserId) {
    check(documentId, String);
    check(anonUserId, Match.Optional(String));
    CommentsCollection.remove({ _id: documentId, userId: (this.userId || anonUserId) });
  },
  'comments/like': function (documentId, anonUserId) {
    check (documentId, String);
    check(anonUserId, Match.Optional(String));

    const userId = this.userId || anonUserId;

    if (!userId) {
      return;
    }

    if (CommentsCollection.findOne({ _id: documentId, likes: { $in: [userId] } })) {
      CommentsCollection.update({ _id: documentId }, { $pull: { likes: userId } }, noOptOptions);
    } else {
      CommentsCollection.update({ _id: documentId }, { $push: { likes: userId } }, noOptOptions);
    }
  },
  'comments/reply/add': function (documentId, docScope, content, anonUserId) {
    check(documentId, String);
    check(docScope, Object);
    check(content, String);
    check(anonUserId, Match.Optional(String));

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserId;

    content = content.trim();

    if (!doc || !userId || !content || !Comments.config().replies) {
      return false;
    }

    const reply = {
      replyId: Random.id(),
      content: content,
      userId: userId,
      createdAt: (new Date()),
      replies: [], likes: [],
      lastUpdatedAt: (new Date()),
      isAnonymous: !!userId
    };

    check(reply, CommentsCollection.schemas.ReplySchema);

    if (docScope._id) {
      // highest level reply
      doc.replies.unshift(reply);
    } else if (docScope.position) {
      // nested reply
      modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
        replies[index].replies.unshift(reply);
      });
    }

    CommentsCollection.update({ _id: documentId }, { $set: { replies: doc.replies } }, noOptOptions);
  },
  'comments/reply/edit': function (documentId, docScope, newContent, anonUserId) {
    check(documentId, String);
    check(docScope, Object);
    check(newContent, String);
    check(anonUserId, Match.Optional(anonUserId));

    const doc = CommentsCollection.findOne(documentId),
      userId = this.userId || anonUserId;

    newContent = newContent.trim();

    if (!userId || !newContent || !Comments.config().replies) {
      return;
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].userId === userId) {
        replies[index].content = newContent;
        replies[index].likes = [];
        replies[index].image = mediaService.getImageFromContent(newContent);
      }
    });

    CommentsCollection.update({ _id: documentId }, { $set: { replies: doc.replies } }, noOptOptions);
  },
  'comments/reply/like': function (documentId, docScope, anonUserId) {
    check(documentId, String);
    check(docScope, Object);
    check(anonUserId, Match.Optional(String));

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserId;

    if (!userId || !Comments.config().replies) {
      return false;
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].likes.indexOf(userId) > -1) {
        replies[index].likes.splice(replies[index].likes.indexOf(userId), 1);
      } else {
        replies[index].likes.push(userId);
      }
    });

    CommentsCollection.update({ _id: documentId }, { $set: { replies: doc.replies }  }, noOptOptions);
  },
  'comments/reply/remove': function (documentId, docScope, anonUserId) {
    check(documentId, String);
    check(docScope, Object);
    check(anonUserId, Match.Optional(String));

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserId;

    if (!userId || !Comments.config().replies) {
      return;
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].userId === userId) {
        replies.splice(index, 1);
      }
    });

    CommentsCollection.update({ _id: documentId }, { $set: { replies: doc.replies }  }, noOptOptions);
  },
  'comments/count': function (referenceId) {
    check(referenceId, String);
    return CommentsCollection.find({ referenceId: referenceId }).count();
  }
});

CommentsCollection.methods = {
  add: (referenceId, content) => callWithAnonUserId('comments/add', referenceId, content),
  reply: (documentId, docScope, content) => callWithAnonUserId('comments/reply/add', documentId, docScope, content),
  like: (documentId) => callWithAnonUserId('comments/like', documentId),
  edit: (documentId, newContent) => callWithAnonUserId('comments/edit', documentId, newContent),
  remove: (documentId) => callWithAnonUserId('comments/remove', documentId),
  likeReply: (documentId, docScope) => callWithAnonUserId('comments/reply/like', documentId, docScope),
  editReply: (documentId, docScope, content) => callWithAnonUserId('comments/reply/edit', documentId, docScope, content),
  removeReply: (documentId, docScope) => callWithAnonUserId('comments/reply/remove', documentId, docScope)
};
