AnonymousUserCollection = new Mongo.Collection('commentsui-anonymoususer');

AnonymousUserCollection.allow({
  insert: () => false,
  update: () => false,
  remove: () => false
});

AnonymousUserCollection.attachSchema(new SimpleSchema({
  username: {
    type: String
  },
  email: {
    type: String
  },
  salt: {
    type: String
  }
}));
