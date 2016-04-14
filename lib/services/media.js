const mediaService = (() => {
  return {
    getMediaFromContent(content) {
      const analyzers = Comments.config().mediaAnalyzers
      let media = {}

      if (analyzers && _.isArray(analyzers)) {
        _.forEach(analyzers, function (analyzer) {
          const mediaContent = analyzer.getMediaFromContent(content)

          if (mediaContent && !media.content) {
            media = {
              type: analyzer.name,
              content: mediaContent
            }
          }
        })
      }

      return media
    },
    getMarkup(media) {
      const analyzers = Comments.config().mediaAnalyzers

      const filteredAnalyzers = _.filter(analyzers, function (filter) {
        return filter.name === media.type
      })

      if (filteredAnalyzers && filteredAnalyzers.length > 0) {
        return filteredAnalyzers[0].getMarkup(media.content)
      }
    }
  }
})()

export default mediaService
