CommentsCollection = new Mongo.Collection('comments');

CommentsCollection.schemas = {};

/**
 * Return a comment schema enhanced with the given schema config.
 *
 * @param additionalSchemaConfig
 *
 * @returns {Object}
 */
function getCommonCommentSchema(additionalSchemaConfig = {}) {
  return {
    userId: {
      type: String
    },
    image: {
      type: String,
      optional: true,
      autoValue: function () {
        return mediaService.getImageFromContent(this.siblingField('content').value);
      }
    },
    content: {
      type: String,
      min: 1,
      max: 10000
    },
    replies: {
      type: [Object],
      autoValue: function () {
        if (this.isInsert) {
          return [];
        }
      },
      optional: true
    },
    likes: {
      type: [String],
      autoValue: function() {
        if (this.isInsert) {
          return [];
        }
      },
      optional: true
    },
    createdAt: {
      type: Date,
      autoValue: function() {
        if (this.isInsert) {
          return new Date;
        } else if (this.isUpsert) {
          return { $setOnInsert: new Date };
        } else {
          this.unset();
        }
      }
    },
    lastUpdatedAt: {
      type: Date,
      autoValue: function() {
        if (this.isUpdate) {
          return new Date();
        }
      },
      denyInsert: true,
      optional: true
    },
    ...additionalSchemaConfig
  };
}

/**
 * Enhance nested replies with correct data.
 *
 * @param {Object} scope
 * @param {Array} position
 *
 * @returns {Array}
 */
function enhanceReplies(scope, position = []) {
  return _.map(scope.replies, function (reply, index) {
    position.push(index);

    reply = {
      ...reply,
      // clone position
      position: position.slice(0),
      documentId: scope._id,
      user: scope.user.bind(reply),
      likesCount: scope.likesCount.bind(reply),
      createdAgo: scope.createdAgo.bind(reply)
    };

    if (reply.replies) {
      // call recursive!
      reply.enhancedReplies = _.bind(
        enhanceReplies,
        null,
        _.extend(_.clone(scope), { replies: reply.replies }),
        position
      )();
    }

    position.pop();

    return reply;
  });
}

CommentsCollection.schemas.ReplySchema = new SimpleSchema(getCommonCommentSchema({
  replyId: {
    type: String
  }
}));

CommentsCollection.schemas.CommentSchema = new SimpleSchema(getCommonCommentSchema({
  referenceId: {
    type: String
  }
}));

CommentsCollection.attachSchema(CommentsCollection.schemas.CommentSchema);

// Is handled with Meteor.methods
CommentsCollection.allow({
  insert: () => false,
  update: () => false,
  remove: () => false
});

CommentsCollection.helpers({
  likesCount: function () {
    if (this.likes && this.likes.length) {
      return this.likes.length;
    }

    return 0;
  },
  user: function () {
    return userService.getUserById(this.userId);
  },
  createdAgo: function () {
    return timeTickService.fromNowReactive(moment(this.createdAt));
  },
  enhancedReplies: function (position) {
    return enhanceReplies(this, position);
  }
});
