hashingService = {
  hash(data) {
    return `${this.getHashedSalt(data)}+${Random.secret(50)}`;
  },
  getHashedSalt: (data) => {
    let hashedSalt = '';
    const anonSalt = Comments.config().anonymousSalt;

    _.times(20, () => {
      hashedSalt += Random.choice(anonSalt) + Random.choice(data.username) + Random.choice(data.email);
    });

    return hashedSalt;
  }
};
