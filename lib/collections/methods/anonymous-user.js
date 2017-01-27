import hashingService from '../../services/hashing'

const checkUsername = username => {
  if (AnonymousUserCollection.findOne({ username })) {
    throw new Meteor.Error('anon-duplicate-username', 'Duplicate username for anonymous user')
  }
}

Meteor.methods({
  'commentsUiAnonymousUser/add'(data) {
    check(data, {
      username: String,
      email: String
    })

    if (Meteor.isServer) {
      data.salt = hashingService.hash(data)
      data.anonIp = this.connection.clientAddress
    } else {
      data.salt = 'fake'
      data.anonIp = 'fake'
    }

    const maxUserCount = Comments.config().anonymousMaxUserCount

    if (AnonymousUserCollection.find(
        { anonIp: data.anonIp, createdAt: { $gte: moment().subtract(10, 'days').toDate() } }).count() >= maxUserCount
    ) {
      throw new Meteor.Error('anon-limit-reached', 'More than 5 anonymous accounts with the same IP')
    }

    checkUsername(data.username)

    return {
      _id: AnonymousUserCollection.insert(data),
      salt: data.salt
    }
  },
  'commentsUiAnonymousUser/update'(_id, salt, data) {
    check(_id, String)
    check(salt, String)
    check(data, {
      username: Match.Optional(String),
      email: Match.Optional(String)
    })

    checkUsername(data.username)

    return AnonymousUserCollection.update({ _id, salt }, { $set: data })
  }
})

AnonymousUserCollection.methods = {
  add: (data, cb) => Meteor.call('commentsUiAnonymousUser/add', data, cb),
  update: (id, salt, data, cb) => Meteor.call('commentsUiAnonymousUser/update', id, salt, data, cb)
}
