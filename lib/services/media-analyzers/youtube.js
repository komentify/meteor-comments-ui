const youtubeAnalyzer = {
  name: 'youtube',
  /**
   * @see http://stackoverflow.com/questions/19377262/regex-for-youtube-url
   *
   * @param {String} content
   *
   * @return {String}
   */
  getMediaFromContent(content) {
    const parts = (/(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/([\w\=\?]+)/gm).exec(content)
    let mediaContent = ''

    if (parts && parts[3]) {
      let id = parts[3]

      if (id.indexOf('v=') > -1) {
        const subParts = (/v=([\w]+)+/g).exec(id)

        if (subParts && subParts[1]) {
          id = subParts[1]
        }
      }

      mediaContent = `http://www.youtube.com/embed/${id}`
    }

    return mediaContent
  },
  /**
   * @param {String} mediaContent
   *
   * @return {String}
   */
  getMarkup: (mediaContent) => `<iframe src="${mediaContent}" type="text/html" frameborder="0"></iframe>`
}

export default youtubeAnalyzer
