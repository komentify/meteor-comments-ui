Comments = (function () {
  var timeTick = new Tracker.Dependency(),
    collection = new Mongo.Collection('comments'),
    noOptOptions = {
      validate: false,
      filter: false,
      getAutoValues: false,
      removeEmptyStrings: false
    },
    ReplySchema, CommentSchema;

  /*
   * Helper Functions
   */

  function transformUser(userId) {
    var user = Meteor.users.findOne(userId),
      displayName;

    if (user) {
      if (user.emails && user.emails[0]) {
        displayName = user.emails[0].address;
      }

      if (user.username) {
        displayName = user.username;
      }

      return { displayName: displayName };
    }
  }

  function transformReplies(scope, position) {
    if (!position) {
      position = [];
    }

    return _.map(scope.replies, function (reply, index) {
      position.push(index);

      reply.position = position;
      reply.documentId = scope._id;

      reply.user = scope.user.bind(reply);
      reply.likesCount = scope.likesCount.bind(reply);
      reply.createdAgo = scope.createdAgo.bind(reply);

      // clone position
      reply.position = position.slice(0);

      if (reply.replies) {
        // recursive!
        reply.enhancedReplies = _.bind(transformReplies, null, _.extend(_.clone(scope), { replies: reply.replies }), position)();
      }

      position.pop();

      return reply;
    });
  }

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

  function getImageFromContent(content) {
    var urls;

    if (content) {
      urls = content.match(/(\S+\.[^/\s]+(\/\S+|\/|))(.jpg|.png|.gif)/g) ;
      
      if (urls && urls[0]) {
        return urls[0];
      }
    }

    return '';
  }

  /*
   * Schema Definitions
   */

  ReplySchema = new SimpleSchema({
    replyId: {
      type: String
    },
    userId: {
      type: String
    },
    image: {
      type: String,
      optional: true,
      autoValue: function () {
        return getImageFromContent(this.siblingField('content').value);
      }
    },
    content: {
      type: String,
      min: 1,
      max: 10000
    },
    replies: {
      type: [Object],
      autoValue: function (doc) {
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
          return {$setOnInsert: new Date};
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
    }
  });

  CommentSchema = new SimpleSchema({
    userId: {
      type: String
    },
    referenceId: {
      type: String
    },
    image: {
      type: String,
      optional: true,
      autoValue: function () {
        return getImageFromContent(this.siblingField('content').value);
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
          return {$setOnInsert: new Date};
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
    }
  });

  /*
   * Model Configuration
   */

  // Reactive moment changes
  Meteor.setInterval(function () {
    timeTick.changed();
  }, 1000);

  function fromNowReactive(mmt) {
    timeTick.depend();
    return mmt.fromNow();
  }

  collection.attachSchema(CommentSchema);

  // Is handled with Meteor.methods
  collection.allow({
    insert: function () { return false; },
    update: function () { return false; },
    remove: function () { return false; }
  });

  collection.helpers({
    likesCount: function () {
      if (this.likes && this.likes.length) {
        return this.likes.length;
      }

      return 0;
    },
    user: function () {
      return transformUser(this.userId);
    },
    createdAgo: function () {
      return fromNowReactive(moment(this.createdAt));
    },
    enhancedReplies: function (position) {
      return transformReplies(this);
    }
  });

  /*
   * Meteor Methods
   */
  
  Meteor.methods({
    'comments/add': function (referenceId, content) {
      check(referenceId, String);
      check(content, String);

      content = content.trim();

      if (!this.userId || !content) {
        return;
      }

      collection.insert(
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

      collection.update(
        { _id: documentId, userId: this.userId },
        { $set: { content: newContent, likes: [], image: getImageFromContent(newContent) } }
      );
    },
    'comments/remove': function (documentId) {
      check(documentId, String);
      collection.remove({ _id: documentId, userId: this.userId });
    },
    'comments/like': function (documentId) {
      check (documentId, String);
      check(this.userId, String);

      if (!this.userId) {
        return;
      }

      if (collection.findOne({ _id: documentId, likes: { $in: [this.userId] } })) {
        collection.update({ _id: documentId }, { $pull: { likes: this.userId } }, noOptOptions)
      } else {
        collection.update({ _id: documentId }, { $push: { likes: this.userId } }, noOptOptions)
      }
    },
    'comments/reply/add': function (documentId, docScope, content) {
      check(documentId, String);
      check(docScope, Object);
      check(content, String);

      var doc = collection.findOne({ _id: documentId }),
          reply;
      
      content = content.trim();

      if (!doc || !this.userId || !content) {
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

      check(reply, ReplySchema);

      if (docScope._id) {
        // highest level reply
        doc.replies.unshift(reply);
      } else if (docScope.position) {
        // nested reply
        modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
          replies[index].replies.unshift(reply);
        });
      }

      collection.update({ _id: documentId }, { $set: { replies: doc.replies } }, noOptOptions);
    },
    'comments/reply/edit': function (documentId, docScope, newContent) {
      check(documentId, String);
      check(docScope, Object);
      check(newContent, String);

      var doc = collection.findOne(documentId),
          userId = this.userId;

      newContent = newContent.trim();

      if (!userId || !newContent) {
        return;
      }

      modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
        if (replies[index].userId === userId) {
          replies[index].content = newContent;
          replies[index].likes = [];
          replies[index].image = getImageFromContent(newContent);
        }
      });

      collection.update({ _id: documentId }, { $set: { replies: doc.replies } }, noOptOptions);
    },
    'comments/reply/like': function (documentId, docScope) {
      check(documentId, String);
      check(docScope, Object);

      var doc = collection.findOne({ _id: documentId }),
          userId = this.userId;

      if (!userId) {
        return;
      }

      modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
        if (replies[index].likes.indexOf(userId) > -1) {
          replies[index].likes.splice(replies[index].likes.indexOf(userId), 1);
        } else {
          replies[index].likes.push(userId);
        }
      });

      collection.update({ _id: documentId }, { $set: { replies: doc.replies }  }, noOptOptions);
    },
    'comments/reply/remove': function (documentId, docScope) {
      check(documentId, String);
      check(docScope, Object);

      var doc = collection.findOne({ _id: documentId }),
          userId = this.userId;

      if (!userId) {
        return;
      }

      modifyNestedReplies(doc.replies, docScope.position, function (replies, index) {
        if (replies[index].userId === userId) {
          replies.splice(index, 1);
        }
      });

      collection.update({ _id: documentId }, { $set: { replies: doc.replies }  }, noOptOptions);
    },
    'comments/count': function (referenceId) {
      check(referenceId, String);
      return collection.find({ referenceId: referenceId }).count();
    }
  });


  if (Meteor.isServer) {
    Meteor.publishComposite('comments/reference', function (id, limit) {
      check(id, String);
      check(limit, Number);

      return {
        find: function () {
          return collection.find({ referenceId: id }, { limit: limit, sort: { createdAt: -1 } });
        },
        children: [{
          find: function (comment) {
            var userIds = getUserIdsByComment(comment);

            return Meteor.users.find({ _id: { $in: userIds } }, { fields: { profile: 1, emails: 1, username: 1 } });
          }
        }]
      };
    })
  }

  /*
   * Public API
   */
  
  return {
    get: function (id) {
      return collection.find({ referenceId: id }, { sort: { createdAt: -1 } });
    },
    getOne: function (id) {
      return collection.findOne({ _id: id });
    },
    getAll: function () {
      return collection.find({}, { sort: { createdAt: -1 } });
    },
    add: function (referenceId, content) {
      Meteor.call('comments/add', referenceId, content);
    },
    edit: function (documentId, newContent) {
      Meteor.call('comments/edit', documentId, newContent);
    },
    remove: function (documentId) {
      Meteor.call('comments/remove', documentId);
    },
    like: function (documentId) {
      Meteor.call('comments/like', documentId);
    },
    reply: function (documentId, docScope, content) {
      Meteor.call('comments/reply/add', documentId, docScope, content);
    },
    editReply: function (documentId, docScope, content) {
      Meteor.call('comments/reply/edit', documentId, docScope, content);
    },
    removeReply: function (documentId, docScope) {
      Meteor.call('comments/reply/remove', documentId, docScope);
    },
    likeReply: function (documentId, docScope) {
      Meteor.call('comments/reply/like', documentId, docScope);
    },
    session: {
      set: function (key, val) {
        return Session.set('commentsUi_' + key, val);
      },
      get: function (key) {
        return Session.get('commentsUi_' + key);
      },
      equals: function (key, val) {
        return Session.equals('commentsUi_' + key, val);
      }
    },
    changeSchema: function (cb) {
      var currentSchema = collection.simpleSchema().schema(),
        callbackResult = cb(currentSchema),
        newSchema;

      newSchema = callbackResult ? callbackResult : currentSchema;
      !!newSchema && collection.attachSchema(newSchema, { replace: true });
    },
    _collection: collection
  };
})();
