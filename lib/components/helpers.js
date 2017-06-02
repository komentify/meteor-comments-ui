import userService from '../services/user'
import commentService from '../services/comment'

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
   * @param {String} originalTemplate
   * @param {Object} templateScope
   *
   * @returns {Object}
   */
  getCustomTemplate: function (templateName, originalTemplate, templateScope) {
    if (_.isString(templateScope[templateName])) {
      Template[templateScope[templateName]].inheritsHelpersFrom(originalTemplate);
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
  allowReplies: function (documentId) {
    const config = Comments.config()

    if (this.position && this.position.length >= 4) {
      return false
    }

    return config.allowReplies ? config.allowReplies(documentId) : config.replies
  },
  uiConfigGet: (key) => Comments.ui.config()[key],
  sessionGet: (key) => Comments.session.get(key),
  templateIs: (name) => name === Comments.ui.config().template,
  textarea: () => Template.commentsTextarea
};
