Meteor.methods({
  'commentsUiAnonymousUser/add': (data) => {
    check(data, {
      username: String,
      email: String
    });

    if (Meteor.isServer) {
      data.salt = hashingService.hash(data);
    } else {
      data.salt = 'fake';
    }

    return {
      _id: AnonymousUserCollection.insert(data),
      salt: data.salt
    };
  },
  'commentsUiAnonymousUser/update': (_id, salt, data) => {
    check(_id, String);
    check(salt, String);
    check(data, {
      username: String,
      email: String
    });

    return AnonymousUserCollection.update({ _id, salt }, { $set: data });
  }
});

AnonymousUserCollection.methods = {
  add: (data, cb) => Meteor.call('commentsUiAnonymousUser/add', data, cb),
  update: (id, salt, data, cb) => Meteor.call('commentsUiAnonymousUser/update', id, salt, data, cb)
};
