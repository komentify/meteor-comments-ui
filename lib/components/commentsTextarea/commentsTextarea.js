import userService from '../../services/user'

Template.commentsTextarea.helpers(_.extend(defaultCommentHelpers, {
  customTextareaTemplate() {
    return defaultCommentHelpers.getCustomTemplate('textareaTemplate', this)
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
