Meteor.methods({
  'commentsUiAnonymousUser/add': (data) => {
    check(data, {
      username: String,
      email: String
    });

    return AnonymousUserCollection.insert(data);
  },
  'commentsUiAnonymousUser/update': (_id, data) => {
    check(_id, String);
    check(data, {
      username: String,
      email: String
    });

    return AnonymousUserCollection.update({ _id }, { $set: data });
  }
});

AnonymousUserCollection.methods = {
  add: (data, cb) => Meteor.call('commentsUiAnonymousUser/add', data, cb),
  update: (id, data) => Meteor.call('commentsUiAnonymousUser/update', id, data)
};
