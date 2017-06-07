export default function (CommentsCollection) {
  const getRatingScore = (doc) => {
    let score

    if (Comments.config().rating === 'stars') {
      score = CommentsCollection._calculateAverageRating(doc.starRatings)
    } else {
      score = doc.likes.length - (doc.dislikes && doc.dislikes.length ? doc.dislikes.length : 0)
    }

    return score
  }

  const updateRatingScoreOnDoc = (_id) => CommentsCollection.update({ _id }, {
    $set: { ratingScore: getRatingScore(CommentsCollection.findOne(_id)) },
  })

  return { getRatingScore, updateRatingScoreOnDoc }
}
