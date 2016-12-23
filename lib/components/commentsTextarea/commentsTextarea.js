import { Template } from 'meteor/templating'
import userService from '../../services/user'

Comments.session.set('sweetCaptchaEnabled', false)
Comments.session.set('regenerateCaptcha', false)

Template.commentsTextarea.helpers(_.extend(defaultCommentHelpers, {
  sweetCaptchaEnabled() {
    return Comments.session.get('sweetCaptchaEnabled')
  },
  customTextareaTemplate() {
    return defaultCommentHelpers.getCustomTemplate('textareaTemplate', 'commentsTextarea', this)
  },
  addButtonKey() {
    return this.reply ? 'add-button-reply' : 'add-button'
  },
  defaultAddButtonText() {
    return this.reply ? 'Add reply' : 'Add comment'
  },
  reply() {
    return this.reply
  },
  anonymousData: () => userService.getAnonymousUserData(userService.getUserId())
}))

Template.commentsTextarea.onRendered(function () {
  if (this.data && this.data.reply) {
    this.$('textarea').focus()
  }

  this.autorun(() => {
    const config = Comments.config()
    const regenerateCaptcha = Comments.session.get('regenerateCaptcha')

    const id = (this.data.id || this.data.scope.referenceId)

    if (config.sweetCaptcha(id) && userService.isAnonymous()) {
      Comments.session.set('regenerateCaptcha', false)
      Comments.session.set('sweetCaptchaEnabled', true)
      Meteor.call('getCaptchaHtml', id, (err, html) => {
        const doc = this.$('.sweet-captcha')[0].contentWindow.document

        doc.open()
        doc.write(html)
        doc.close()
      })
    }
  })
})
