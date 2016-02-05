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

Meteor.methods({
  'comments/add': function (referenceId, content) {
    check(referenceId, String);
    check(content, String);

    content = content.trim();

    if (!this.userId || !content) {
      return;
    }

    CommentsCollection.insert(
      { referenceId: referenceId, content: content, userId: this.userId, createdAt: (new Date()), likes: [], replies: [] }
    );
  },
  'comments/edit': function (documentId, newContent) {
    check(documentId, String);
    check(newContent, String);

    newContent = newContent.trim();

    if (!this.userId || !newContent) {
      return;
    }

    CommentsCollection.update(
      { _id: documentId, userId: this.userId },
      { $set: { content: newContent, likes: [], image: mediaService.getImageFromContent(newContent) } }
    );
  },
  'comments/remove': function (documentId) {
    check(documentId, String);
    CommentsCollection.remove({ _id: documentId, userId: this.userId });
  },
  'comments/like': function (documentId) {
    check (documentId, String);
    check(this.userId, String);

    if (!this.userId) {
      return;
    }

    if (CommentsCollection.findOne({ _id: documentId, likes: { $in: [this.userId] } })) {
      CommentsCollection.update({ _id: documentId }, { $pull: { likes: this.userId } }, noOptOptions)
    } else {
      CommentsCollection.update({ _id: documentId }, { $push: { likes: this.userId } }, noOptOptions)
    }
  },
  'comments/reply/add': function (documentId, docScope, content) {
    check(documentId, String);
    check(docScope, Object);
    check(content, String);

    var doc = CommentsCollection.findOne({ _id: documentId }),
      reply;

    content = content.trim();

    if (!doc || !this.userId || !content || !Comments.config().replies) {
      return false;
    }

    reply = {
      replyId: Random.id(),
      content: content,
      userId: this.userId,
      createdAt: (new Date()),
      replies: [], likes: [],
      lastUpdatedAt: (new Date())
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
  'comments/reply/edit': function (documentId, docScope, newContent) {
    check(documentId, String);
    check(docScope, Object);
    check(newContent, String);

    var doc = CommentsCollection.findOne(documentId),
      userId = this.userId;

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
  'comments/reply/like': function (documentId, docScope) {
    check(documentId, String);
    check(docScope, Object);

    var doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId;

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
  'comments/reply/remove': function (documentId, docScope) {
    check(documentId, String);
    check(docScope, Object);

    var doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId;

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
