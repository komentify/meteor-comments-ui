import { check, Match } from 'meteor/check'
import userService from '../services/user'

export const verifyContent = content => {
  check(content, String)
  return content.trim()
}

export const verifyUserData = (meteorUserId, anonUserData, referenceId) => {
  check(anonUserData, Match.Maybe(Object))
  anonUserData = anonUserData || {}

  userService.verifyAnonUserData(anonUserData, referenceId)

  return { anonUserData, userId: (meteorUserId || anonUserData._id) }
}
