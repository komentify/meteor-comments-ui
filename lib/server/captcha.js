import { Meteor } from 'meteor/meteor'
import { retrieveCaptchaHtml } from '../services/captcha-service'

Meteor.methods({
  getCaptchaHtml: async (cb) => await retrieveCaptchaHtml(Comments.config().sweetCaptcha),
})
