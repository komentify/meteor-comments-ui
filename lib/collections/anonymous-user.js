AnonymousUserCollection = new Mongo.Collection('commentsui-anonymoususer')

AnonymousUserCollection.allow({
  insert: () => false,
  update: () => false,
  remove: () => false
})

AnonymousUserCollection.attachSchema(new SimpleSchema({
  username: {
    type: String,
    optional: true
  },
  email: {
    type: String,
    optional: true
  },
  anonIp: {
    type: String
  },
  salt: {
    type: String
  },
  createdAt: {
    type: Date,
    autoValue() {
      if (this.isInsert) {
        return new Date()
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() }
      } else {
        this.unset()
      }
    }
  }
}))
