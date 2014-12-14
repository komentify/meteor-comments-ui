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
      type: Number,
      autoValue: function() {
        if (this.isInsert) {
          return 0;
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

  Meteor.methods({
    addComment: function (referenceId, content) {
      check(referenceId, String);
      check(content, String);

      collection.insert({ referenceId: referenceId, content: content, userId: this.userId });
    }
  });

  return {
    get: function (id) {
      return collection.find({ referenceId: id }, { sort: { createdAt: -1 } });
    },
    add: function (referenceId, content) {
      Meteor.call('addComment', referenceId, content);
    },
    _collection: collection
  };
})();
