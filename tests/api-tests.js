/**
 * Setup collections for tests
 */

Meteor.methods({
  'removeGeneratedDocs': function (id) {
    Comments._collection.remove({ userId: id });
  }
});

if (Meteor.isClient) {
  Meteor.subscribe('allComments');

  var id = Comments._collection.insert({ 'referenceId' : 'rawInsertDocId', 'content' : 'oldContent', 'userId' : 'works' });
  Comments._collection.update(id, { $set: { 'content' : 'newContent'} });

  Comments._collection.remove('shoudldNotBeRemovable');

  Accounts.createUser({
    username: 'test',
    password: 'test1234'
  });

} else if (Meteor.isServer) {
  Comments._collection.remove({});
  Comments._collection.insert({ 'referenceId' : 'othersDoc', 'userId' : 'someBodyElse', 'content' : 'nice' });

  Meteor.methods({
    'getDoc' : function (referenceId) {
      return Comments._collection.findOne({ referenceId: referenceId });
    }
  });

  Meteor.publish('allComments', function () {
    return Comments.getAll();
  });
}

/**
 * Run tests
 */

if (Meteor.isClient) {
  Tinytest.add('Comments - add', function (test) {
    Meteor.call('removeGeneratedDocs', Meteor.userId());

    Comments.add('fakeDoc1', 'I liked this');
    Comments.add('fakeDoc1', 'I did not like it');

    var comments = Comments.get('fakeDoc1').fetch();
    test.equal(comments[0].content, 'I did not like it');
    test.equal(comments[0].userId, Meteor.userId());
    test.equal(comments[0].referenceId, 'fakeDoc1');
    test.equal(comments[1].content, 'I liked this');
    test.equal(comments[1].userId, Meteor.userId());
    test.equal(comments[1].referenceId, 'fakeDoc1');
  });

  Tinytest.add('Comments - get', function (test) {
    Meteor.call('removeGeneratedDocs', Meteor.userId());

    Comments.add('getDoc1', 'I will like it');
    Comments.add('getDoc1', 'I will like it not');
    Comments.add('getDoc2', 'This is another comment');

    test.equal(Comments.get('getDoc1').count(), 2);
    test.equal(Comments.get('getDoc2').count(), 1);
    test.equal(Comments.get('getDoc1').fetch()[0].userId, Meteor.userId());
    test.equal(Comments.get('getDoc1').fetch()[0].likes.length, 0);
    test.equal(Comments.get('getDoc1').fetch()[0].referenceId, 'getDoc1');
    test.equal(Comments.get('getDoc1').fetch()[0].content, 'I will like it not');
    test.equal(Comments.get('getDoc2').fetch()[0].content, 'This is another comment');
    test.equal(Comments.get('nonExistant').count(), 0);
  });

  Tinytest.add('Comments - getAll', function (test) {
    Meteor.call('removeGeneratedDocs', Meteor.userId());

    Comments.add('getAllDoc1', 'I will like it all');
    Comments.add('getAllDoc2', 'I will like it all not');
    Comments.add('getAllDoc3', 'This is another all comment');

    var allComments = Comments.getAll().fetch();
    test.equal(Comments.getAll().count(), 4);
    test.equal(allComments[0].content, 'This is another all comment');
    test.equal(allComments[0].referenceId, 'getAllDoc3');
    test.equal(allComments[1].content, 'I will like it all not');
    test.equal(allComments[1].referenceId, 'getAllDoc2');
    test.equal(allComments[2].content, 'I will like it all');
    test.equal(allComments[2].referenceId, 'getAllDoc1');
  });

  Tinytest.add('Comments - remove', function (test) {
    Meteor.call('removeGeneratedDocs', Meteor.userId());

    Comments.add('othersDoc', 'I like this, its my comment');

    var comments = Comments.get('othersDoc').fetch();

    test.equal(Comments.get('othersDoc').count(), 2);
    test.equal(comments[0].content, 'I like this, its my comment');
    test.equal(comments[0].userId, Meteor.userId());
    test.equal(comments[1].userId, 'someBodyElse');

    Comments.remove(comments[1]._id);

    comments = Comments.get('othersDoc').fetch();

    test.equal(Comments.get('othersDoc').count(), 2);
    test.equal(comments[0].userId, Meteor.userId());
    test.equal(comments[1].userId, 'someBodyElse');

    Comments.remove(comments[0]._id);

    comments = Comments.get('othersDoc').fetch();

    test.equal(Comments.get('othersDoc').count(), 1);
    test.equal(comments[0].userId, 'someBodyElse');
  });

  Tinytest.addAsync('Comments - Raw Collecton Remove', function (test, completed) {
    var id = Comments._collection.findOne({ referenceId: 'othersDoc' })._id;
    test.equal(!!id, true);

    Comments._collection.remove(id);
    Meteor.call('getDoc', 'othersDoc', function (err, doc) {
      test.equal(doc.content, 'nice');
      test.equal(doc.userId, 'someBodyElse');
      completed();
    });
  });

  Tinytest.add('Comments - like', function (test) {
    Meteor.call('removeGeneratedDocs', Meteor.userId());

    Comments.add('likesDoc', 'Please give me likes');

    var comments = Comments.get('likesDoc').fetch();
    test.equal(comments[0].content, 'Please give me likes');
    test.equal(comments[0].likes.length, 0);

    Comments.like(comments[0]._id);
    comments = Comments.get('likesDoc').fetch();
    test.equal(comments[0].likes.length, 1);

    Comments.like(comments[0]._id);
    comments = Comments.get('likesDoc').fetch();
    test.equal(comments[0].likes.length, 0);

    Comments.like(comments[0]._id);
    comments = Comments.get('likesDoc').fetch();
    test.equal(comments[0].likes.length, 1);
  });
}

if (Meteor.isServer) {
  Tinytest.add('Comments - Raw Collection Insert and Update', function (test) {
    test.equal(Comments.get('rawInsertDocId').count(), 0);
  });
}
