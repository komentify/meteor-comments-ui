import userService from '../../services/user'

Template.commentsList.helpers(_.extend(defaultCommentHelpers, {
  comment() {
    return Comments.get(this.id, Comments.getSortOption(Comments.ui.getSorting(this.id)))
  },
  customLoadingTemplate() {
    return defaultCommentHelpers.getCustomTemplate('loadingTemplate', 'commentsList', this)
  },
  customListTemplate() {
    return defaultCommentHelpers.getCustomTemplate('commentListTemplate', 'commentsList', this)
  }
}))

Template.commentsList.onCreated(function () {
  this.autorun(() => {
    this.subscribe(
      'comments/reference',
      this.data.id,
      (userService.isAnonymous() ? userService.getUserData() : {}),
      Comments.ui.getSorting(this.data.id),
      Comments.ui.config().limit
    )
  })
})
