userService = (function () {
  return {
    /**
     * Return the user id with logic for anonymous users.
     *
     * @param {String} userId Optional user id
     *
     * @returns {String}
     */
    getUserId() {
      let userId = '';

      if (userService.isAnonymous()) {
        userId = localStorage.getItem('commentsui-anonUserId');
      }

      if (!userId) {
        userId = Meteor.userId();
      }

      return userId;
    },

    /**
     * Return anonymous user data
     *
     * @returns {Object}
     */
    getAnonymousUserData: (_id) => AnonymousUserCollection.findOne({ _id }),

    /**
     * Update anonymous user based on given data.
     *
     * @param {Object} data
     */
    updateAnonymousUser(data) {
      const userId = localStorage.getItem('commentsui-anonUserId');

      if (!userId) {
        AnonymousUserCollection.methods.add(data, (err, id) => {
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
      const user = Meteor.users.findOne(userId),
        anonymousUser = AnonymousUserCollection.findOne({ _id: userId });

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
      } else if (anonymousUser) {
        return { displayName: anonymousUser.username };
      }
    }
  };
})();
