function cleanUpUsers() {
  Meteor.users.find({ 'profile.anonymous': true }).forEach((user) => {
    const diffInHours = moment(new Date()).diff(user.profile.createdAt) / 1000 / 60 / 60 / 24;

    if (diffInHours > 1 || !user.profile.createdAt) {
      Meteor.users.update({ _id: user._id });
    }
  });
}

Meteor.startup(function () {
  if (Comments.config().anonymous) {
    // TODO: only cleanup users without any comments!
    //Meteor.setInterval(cleanUpUsers, 1000 * 60 * 60 * 2);
  }
});
