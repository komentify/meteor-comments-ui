import userService from '../services/user'

defaultCommentHelpers = {
  take: function (params) {
    var content = Comments.session.get('content');

    if (content && content[params.hash.key]) {
      return content[params.hash.key];
    }

    return params.hash.default;
  },
  /**
   * Return custom templates with helpers from commentsBox
   *
   * @param {String} templateName
   * @param {Object} templateScope
   *
   * @returns {Object}
   */
  getCustomTemplate: function (templateName, templateScope) {
    if (_.isString(templateScope[templateName])) {
      Template[templateScope[templateName]].inheritsHelpersFrom("commentsBox");
      return Template[templateScope[templateName]];
    }
  },
  hasMoreComments: function () {
    return Comments.get(this.id).count() < Comments.session.get(this.id + '_count');
  },
  commentId: function () {
    return this._id || this.replyId;
  },
  showAnonymousInput: (isReply) => userService.isAnonymous() && !isReply,
  configGet: (key) => Comments.config()[key],
  uiConfigGet: (key) => Comments.ui.config()[key],
  sessionGet: (key) => Comments.session.get(key),
  templateIs: (name) => name === Comments.ui.config().template,
  textarea: () => Template.commentsTextarea
};
