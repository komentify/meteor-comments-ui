import { Template } from 'meteor/templating'
import userService from '../../services/user'

Template.commentsTextarea.helpers(_.extend(defaultCommentHelpers, {
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
  anonymousData: () => userService.getAnonymousUserData(userService.getUserId()),
}))

Template.commentsTextarea.onRendered(function () {
  if (this.data && this.data.reply) {
    this.$('textarea').focus()
  }
})
