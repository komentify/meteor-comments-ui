userService = (function () {
  return {
    /**
     * Return the user id with logic for anonymous users.
     */
    getUserId(userId) {
      if (this.isAnonymous()) {
        // TODO: implement
      }

      return userId;
    },

    /**
     * Update anonymous user based on given data.
     *
     * @param {Object} data
     */
    updateAnonymousUser(data) {
      const userId = localStorage.getItem('commentsui-anonUserId');

      if (!userId) {
        AnonymousUserCollection.methods.add(data, (id) => {
          localStorage.setItem('commentsui-anonUserId', id);
        });
      } else {
        AnonymousUserCollection.methods.update(userId, data);
      }
    },

    /**
     * Return true if anonymous form fields should be displayed
     *
     * @returns {Boolean}
     */
    isAnonymous: () => Comments.config().anonymous && !Meteor.userId(),

    /**
     * Return user information of the provided userId
     *
     * @returns {Object}
     */
    getUserById(userId) {
      const user = Meteor.users.findOne(userId);

      if (user) {
        let displayName;

        //oauth facebook users (maybe others)
        if (user.profile) {
          displayName = user.profile.name;
        }

        if (user.emails && user.emails[0]) {
          displayName = user.emails[0].address;
        }

        if (user.username) {
          displayName = user.username;
        }

        return { displayName };
      }
    }
  };
})();
