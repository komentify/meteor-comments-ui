mediaService = (() => {
  return {
    getImageFromContent(content) {
      if (content) {
        const urls = content.match(/(\S+\.[^/\s]+(\/\S+|\/|))(.jpg|.png|.gif)/g) ;

        if (urls && urls[0]) {
          return urls[0];
        }
      }

      return '';
    }
  }
})();
