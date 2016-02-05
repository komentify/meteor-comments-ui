Meteor.methods({
  'commentsUiAnonymousUser/add': (data) => {
    return AnonymousUserCollection.insert(data);
  },
  'commentsUiAnonymousUser/update': (_id, data) => {
    return AnonymousUserCollection.update({ _id }, data);
  }
});

AnonymousUserCollection.methods = {
  add: (data, cb) => Meteor.call('commentsUiAnonymousUser/add', data, cb),
  update: (id, data) => Meteor.call('commentsUiAnonymousUser/update', id, data)
};
