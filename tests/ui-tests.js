Tinytest.add('Comments - UI - config', function (test) {
  Comments.ui.config({
    limit: 20,
    loadMoreCount: 30,
    template: 'customFramework',
    defaultAvatar:'customUrl.png'
  });

  test.equal(Comments.ui.config().limit, 20);
  test.equal(Comments.ui.config().loadMoreCount, 30);
  test.equal(Comments.ui.config().template, 'customFramework');
  test.equal(Comments.ui.config().defaultAvatar, 'customUrl.png');
});

Tinytest.add('Comments - UI - setContent', function (test) {
  test.equal(Comments.session.get('content'), {});

  Comments.ui.setContent({
    edit: 'Editieren',
    remove: 'Löschen'
  });

  test.equal(Comments.session.get('content').edit, 'Editieren');
  test.equal(Comments.session.get('content').remove, 'Löschen');
});


Tinytest.addAsync('Comments - UI - callIfLoggedIn', function (test, done) {
  var originalUserId = Meteor.userId;

  Meteor.userId = function () {
    return false;
  };
  
  Comments.ui.callIfLoggedIn('remove comments', function () {
    throw new Meteor.Error('Should not execute this code');
  });

  test.equal(Comments.session.get('loginAction'), 'remove comments');

  Meteor.userId = function () {
    return true;
  };

  Comments.ui.callIfLoggedIn('remove comments', function () {
    Meteor.userId = originalUserId;
    done();
  });
});
