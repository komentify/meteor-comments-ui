const hashingService = {
  /**
   * Hash the given data with a random secret.
   *
   * @param {Object} data
   *
   * @returns {String}
   */
  hash(data) {
    return `${this.getHashFromData(data)}+${Random.secret(50)}`
  },
  /**
   * Return a hash from the given data.
   *
   * @param {Object} data
   *
   * @returns {String}
   */
  getHashFromData: (data) => {
    let hashedSalt = ''
    const anonSalt = Comments.config().anonymousSalt

    _.times(20, () => {
      hashedSalt += Random.choice(anonSalt) + Random.choice(data.username) + Random.choice(data.email)
    })

    return hashedSalt
  }
}

export default hashingService
