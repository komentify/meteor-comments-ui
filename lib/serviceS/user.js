userService = (function () {
  return {
    /**
     * Return the user id with logic for anonymous users.
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
     * Return user id and salt as an object
     *
     * @returns {Object}
     */
    getUserData() {
      return {
        _id: userService.getUserId(),
        salt: (localStorage.getItem('commentsui-anonSalt') || '')
      };
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
     * @param {Function} callback
     */
    updateAnonymousUser(data, callback) {
      const userData = userService.getUserData();

      if (!userData._id || !userData.salt) {
        AnonymousUserCollection.methods.add(data, (err, data) => {
          localStorage.setItem('commentsui-anonUserId', data._id);
          localStorage.setItem('commentsui-anonSalt', data.salt);
          callback();
        });
      } else if (data.username && data.email) {
        // TODO: only update if data changed
        AnonymousUserCollection.methods.update(userData._id, userData.salt, data, () => callback());
      } else {
        callback();
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
    },

    /**
     * Throw an error if provided anon user data is invalid.
     *
     * @params {Object} anonUserData
     */
    verifyAnonUserData(anonUserData) {
      if (anonUserData._id) {
        check(anonUserData, {
          _id: String,
          salt: String
        });

        if (Meteor.isServer && !AnonymousUserCollection.findOne(anonUserData)) {
          throw new Error('Invalid anon user data provided');
        }
      } else {
        check(anonUserData, {});
      }
    }
  };
})();
