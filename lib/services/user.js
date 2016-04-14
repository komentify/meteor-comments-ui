const userService = (function () {
  if (Meteor.isClient) {
    Meteor.startup(function () {
      userService.setUserData({
        _id: userService.getUserId(),
        salt: (localStorage.getItem('commentsui-anonSalt') || '')
      })
    })
  }

  return {
    /**
     * Return the user id with logic for anonymous users.
     *
     * @returns {String}
     */
    getUserId() {
      let userId = ''

      if (userService.isAnonymous()) {
        userId = localStorage.getItem('commentsui-anonUserId')
      }

      if (!userId) {
        userId = Meteor.userId()
      }

      return userId
    },

    /**
     * Set reactive user data
     *
     * @param {Object} userData
     */
    setUserData(userData) {
      Session.set('commentsui-anonData', userData)
    },

    /**
     * Return user id and salt as an object
     *
     * @returns {Object}
     */
    getUserData() {
      return Session.get('commentsui-anonData')
    },

    /**
     * Return anonymous user data
     *
     * @returns {Object}
     */
    getAnonymousUserData: (_id) => AnonymousUserCollection.findOne({ _id }),

    /**
     * Return true if current user has changed it's profile data.
     */
    userHasChanged(data) {
      const userData = this.getAnonymousUserData(
        this.getUserData()._id
      )

      return data.username && data.email && userData
        && (userData.username !== data.username
        || userData.email !== data.email)
    },

    /**
     * Update anonymous user based on given data.
     *
     * @param {Object} data
     * @param {Function} callback
     */
    updateAnonymousUser(data, callback) {
      const userData = userService.getUserData()

      // check if user still exists
      if (userData._id && userData.salt && !AnonymousUserCollection.findOne({ _id: userData._id, salt: userData.salt })) {
        userData._id = null
        userData.salt = null
      }

      if (!userData._id || !userData.salt) {
        AnonymousUserCollection.methods.add(data, (err, data) => {
          if (err)
            throw new Error(err)

          localStorage.setItem('commentsui-anonUserId', data._id)
          localStorage.setItem('commentsui-anonSalt', data.salt)
          userService.setUserData(data)
          callback(data)
        })
      } else if (this.userHasChanged(data)) {
        AnonymousUserCollection.methods.update(userData._id, userData.salt, data, () => callback(data))
      } else {
        callback(data)
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
        anonymousUser = AnonymousUserCollection.findOne({ _id: userId }),
        generateUsername = Comments.config().generateUsername

      if (user) {
        let displayName

        //oauth facebook users (maybe others)
        if (user.profile) {
          displayName = user.profile.name
        }

        if (user.emails && user.emails[0]) {
          displayName = user.emails[0].address
        }

        if (user.username) {
          displayName = user.username
        }

        if (generateUsername) {
          displayName = generateUsername(user)
        }

        return { displayName }
      } else if (anonymousUser) {
        return { displayName: anonymousUser.username }
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
        })

        if (Meteor.isServer && !AnonymousUserCollection.findOne(anonUserData)) {
          throw new Error('Invalid anon user data provided')
        }
      } else {
        check(anonUserData, {})
      }
    }
  }
})()

export default userService
