import userService from '../../services/user'

Template.commentsSubheader.helpers(_.extend(defaultCommentHelpers, {
  customSubheaderTemplate() {
    return defaultCommentHelpers.getCustomTemplate('subheaderTemplate', this)
  },
  sortingOption() {
    return Comments.config().sortingOptions
  },
  currentSortOption() {
    return this.value === Comments.session.get(Template.parentData().id + '_sorting')
  }
}))

Template.commentsSubheader.onRendered(function () {
  $('.ui.dropdown').dropdown()
})

Template.commentsSubheader.events({
  'change .sorting-dropdown': function (e) {
    Comments.ui.clearHandles()
    Comments.session.set(this.id + '_sorting', $(e.target).val())
  }
})
