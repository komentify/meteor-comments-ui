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
  const currentPos = position.shift();

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
function callWithAnonUserData(methodName, ...methodArgs) {
  const anonUserData = userService.isAnonymous() ? userService.getUserData() : {};
  Meteor.apply(methodName, [...methodArgs, anonUserData]);
}

/**
 * Return a mongodb style field descriptor
 *
 * e.g "replies.0.replies.1" which points at the second reply of the first reply.
 *
 * @param {undefined|Array} position
 *
 * @return {String}
 */
function getMongoReplyFieldDescriptor(position) {
  if (!position) {
    return '';
  }

  const descriptorWithLeadingDot = _.reduce(position, function (descriptor, positionNumber) {
    return `${descriptor}replies.${positionNumber}.`;
  }, '');

  return descriptorWithLeadingDot.substr(0, descriptorWithLeadingDot.length - 1);
}

const triggerEvent = (name, action, payload) => {
  const func = Comments.config().onEvent;

  if (_.isFunction(func)) {
    func(name, action, payload);
  }
};

Meteor.methods({
  'comments/add': function (referenceId, content, anonUserData) {
    check(referenceId, String);
    check(content, String);

    userService.verifyAnonUserData(anonUserData);
    const userId = this.userId || anonUserData._id;

    content = content.trim();

    if (userId && content) {
      const doc = {
        referenceId,
        content,
        userId,
        createdAt: (new Date()),
        likes: [],
        replies: [],
        isAnonymous: !!anonUserData._id,
        media: mediaService.getMediaFromContent(content)
      };

      const docId = CommentsCollection.insert(doc);

      triggerEvent('comment', 'add', Object.assign({}, doc, { _id: docId }));
    }
  },
  'comments/edit': function (documentId, newContent, anonUserData) {
    check(documentId, String);
    check(newContent, String);

    userService.verifyAnonUserData(anonUserData);
    const userId = this.userId || anonUserData._id;

    newContent = newContent.trim();

    if (!userId || !newContent) {
      return;
    }

    const setDoc = { content: newContent, likes: [], media: mediaService.getMediaFromContent(newContent) };
    const findSelector = { _id: documentId, userId };

    CommentsCollection.update(
      findSelector,
      { $set: setDoc }
    );

    triggerEvent('comment', 'edit', Object.assign({}, setDoc, findSelector));
  },
  'comments/remove': function (documentId, anonUserData) {
    check(documentId, String);

    userService.verifyAnonUserData(anonUserData);
    const userId = this.userId || anonUserData._id;

    const removeSelector = { _id: documentId, userId };

    const doc = CommentsCollection.findOne(removeSelector);

    CommentsCollection.remove(removeSelector);

    triggerEvent('comment', 'remove', doc);
  },
  'comments/like': function (documentId, anonUserData) {
    check (documentId, String);

    userService.verifyAnonUserData(anonUserData);
    const userId = this.userId || anonUserData._id;

    if (!userId || Comments.config().rating !== 'likes') {
      return;
    }

    const findSelector = { _id: documentId };

    if (CommentsCollection.findOne({ _id: documentId, likes: { $in: [userId] } })) {
      CommentsCollection.update(findSelector, { $pull: { likes: userId } }, noOptOptions);
    } else {
      CommentsCollection.update(findSelector, { $push: { likes: userId } }, noOptOptions);
    }

    triggerEvent('comment', 'like', Object.assign({}, findSelector, {
      userId
    }));
  },
  'comments/star': function (documentId, starsCount, anonUserData) {
    check(documentId, String);
    check(starsCount, Number);

    userService.verifyAnonUserData(anonUserData);
    const userId = this.userId || anonUserData._id;

    if (!userId || Comments.config().rating !== 'stars') {
      return;
    }

    const findSelector = { _id: documentId };

    if (CommentsCollection.findOne({ _id: documentId, 'starRatings.userId': userId })) {
      CommentsCollection.update(findSelector, { $pull: { starRatings : { userId } } }, noOptOptions);
    }

    CommentsCollection.update(findSelector, { $push: { starRatings: { userId, rating: starsCount } } });
    triggerEvent('comment', 'star', Object.assign({}, findSelector, {
      userId,
      rating: starsCount
    }));
  },
  'comments/reply/add': function (documentId, docScope, content, anonUserData) {
    check(documentId, String);
    check(docScope, Object);
    check(content, String);
    userService.verifyAnonUserData(anonUserData);

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id;

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
      isAnonymous: !!anonUserData._id,
      media: mediaService.getMediaFromContent(content)
    };

    check(reply, CommentsCollection.schemas.ReplySchema);

    let fieldDescriptor = 'replies';

    if (docScope.position) {
      fieldDescriptor = getMongoReplyFieldDescriptor(docScope.position) + '.replies';
    }

    const modifier = {
      $push: {
        [fieldDescriptor]: {
          $each: [reply],
          $position: 0
        }
      }
    };

    const findSelector = { _id: documentId };

    CommentsCollection.update(findSelector, modifier, noOptOptions);
    triggerEvent('reply', 'add', Object.assign({}, reply, findSelector, {
      userId,
      rootUserId: doc.userId
    }));
  },
  'comments/reply/edit': function (documentId, docScope, newContent, anonUserData) {
    check(documentId, String);
    check(docScope, Object);
    check(newContent, String);

    userService.verifyAnonUserData(anonUserData);

    const doc = CommentsCollection.findOne(documentId),
      userId = this.userId || anonUserData._id;

    let reply = {};

    newContent = newContent.trim();

    if (!userId || !newContent || !Comments.config().replies) {
      return;
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].userId === userId) {
        replies[index].content = newContent;
        replies[index].likes = [];
        replies[index].starRatings = [];
        replies[index].media = mediaService.getMediaFromContent(newContent);
        reply = replies[index];
      }
    });

    const findSelector = { _id: documentId };

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies } }, noOptOptions);
    triggerEvent('reply', 'edit', Object.assign({}, findSelector, reply, {
      userId,
      rootUserId: doc.userId
    }));
  },
  'comments/reply/like': function (documentId, docScope, anonUserData) {
    check(documentId, String);
    check(docScope, Object);
    userService.verifyAnonUserData(anonUserData);

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id;

    if (!userId || !Comments.config().replies || Comments.config().rating !== 'likes') {
      return false;
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].likes.indexOf(userId) > -1) {
        replies[index].likes.splice(replies[index].likes.indexOf(userId), 1);
      } else {
        replies[index].likes.push(userId);
      }
    });

    const findSelector = { _id: documentId };

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions);
    triggerEvent('reply', 'like', Object.assign({}, findSelector, {
      userId,
      rootUserId: doc.userId
    }));
  },
  'comments/reply/star': function (documentId, docScope, starsCount, anonUserData) {
    check(documentId, String);
    check(docScope, Object);
    check(starsCount, Number);
    userService.verifyAnonUserData(anonUserData);

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id;

    if (!userId || !Comments.config().replies || Comments.config().rating !== 'stars') {
      return false;
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      let starRatings = replies[index].starRatings;

      if (!starRatings) {
        starRatings = [];
      }

      let ratings = starRatings;

      if (_.find(starRatings, rating => rating.userId === userId)) {
        ratings = _.filter(starRatings, rating => rating.userId !== userId);
      }

      ratings.push({ userId, rating: starsCount });
      replies[index].starRatings = ratings;
    });

    const findSelector = { _id: documentId };

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions);
    triggerEvent('reply', 'star', Object.assign({}, findSelector, {
      userId,
      rating: starsCount,
      rootUserId: doc.userId
    }));
  },
  'comments/reply/remove': function (documentId, docScope, anonUserData) {
    check(documentId, String);
    check(docScope, Object);
    userService.verifyAnonUserData(anonUserData);

    const doc = CommentsCollection.findOne({ _id: documentId }),
      userId = this.userId || anonUserData._id;

    let reply = {};

    if (!userId || !Comments.config().replies) {
      return;
    }

    modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
      if (replies[index].userId === userId) {
        reply = replies[index];
        replies.splice(index, 1);
      }
    });

    const findSelector = { _id: documentId };

    CommentsCollection.update(findSelector, { $set: { replies: doc.replies }  }, noOptOptions);
    triggerEvent('reply', 'remove', Object.assign({}, reply, findSelector, {
      rootUserId: doc.userId
    }));
  },
  'comments/count': function (referenceId) {
    check(referenceId, String);
    return CommentsCollection.find({ referenceId: referenceId }).count();
  }
});

CommentsCollection.methods = {
  add: (referenceId, content) => callWithAnonUserData('comments/add', referenceId, content),
  reply: (documentId, docScope, content) => callWithAnonUserData('comments/reply/add', documentId, docScope, content),
  like: (documentId) => callWithAnonUserData('comments/like', documentId),
  likeReply: (documentId, docScope) => callWithAnonUserData('comments/reply/like', documentId, docScope),
  star: (documentId, starsCount) => callWithAnonUserData('comments/star', documentId, starsCount),
  starReply: (documentId, docScope, starsCount) => callWithAnonUserData('comments/reply/star', documentId, docScope, starsCount),
  edit: (documentId, newContent) => callWithAnonUserData('comments/edit', documentId, newContent),
  editReply: (documentId, docScope, content) => callWithAnonUserData('comments/reply/edit', documentId, docScope, content),
  remove: (documentId) => callWithAnonUserData('comments/remove', documentId),
  removeReply: (documentId, docScope) => callWithAnonUserData('comments/reply/remove', documentId, docScope)
};
