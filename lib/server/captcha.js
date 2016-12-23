import { check } from 'meteor/check'
import { Meteor } from 'meteor/meteor'
import { retrieveCaptchaHtml } from '../services/captcha-service'

Meteor.methods({
  getCaptchaHtml: async (id) => {
    check(id, String)

    return await retrieveCaptchaHtml(Comments.config().sweetCaptcha(id))
  },
})
