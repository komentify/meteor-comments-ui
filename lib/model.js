Comments = (function () {
  var collection = new Mongo.Collection('comments'),
    CommentSchema;

  CommentSchema = new SimpleSchema({
    userId: {
      type: String
    },
    referenceId: {
      type: String
    },
    content: {
      type: String,
      max: 200
    },
    replies: {
      // TODO: does this self reference work?
      type: [CommentSchema],
      optional: true
    },
    likes: {
      type: [String],
      autoValue: function() {
        if (this.isInsert) {
          return [];
        }
      }
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

  collection.attachSchema(CommentSchema);

  // Is handled with Meteor.methods
  collection.allow({
    insert: function () { return false; },
    update: function () { return false; },
    remove: function () { return false; }
  });

  collection.helpers({
    'likesCount' : function () {
      if (this.likes && this.likes.length) {
        return this.likes.length;
      }

      return 0;
    }
  });

  Meteor.methods({
    addComment: function (referenceId, content) {
      check(referenceId, String);
      check(content, String);

      collection.insert({ referenceId: referenceId, content: content, userId: this.userId, createdAt: (new Date()) });
    },
    removeComment: function (documentId) {
      check(documentId, String);
      collection.remove({ _id: documentId, userId: this.userId });
    },
    like: function (documentId) {
      check (documentId, String);

      if (collection.findOne({ _id: documentId, likes: { $in: [this.userId] } })) {
        collection.update({ _id: documentId }, { $pull: { likes: this.userId } })
      } else {
        collection.update({ _id: documentId }, { $push: { likes: this.userId } })
      }
    }
  });

  return {
    get: function (id) {
      return collection.find({ referenceId: id }, { sort: { createdAt: -1 } });
    },
    add: function (referenceId, content) {
      Meteor.call('addComment', referenceId, content);
    },
    like: function (documentId) {
      Meteor.call('like', documentId);
    },
    remove: function (documentId) {
      Meteor.call('removeComment', documentId);
    },
    _collection: collection
  };
})();
