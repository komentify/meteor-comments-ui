import {
  removeReplyByReplyId,
  adjustReplyByReplyId,
  getMongoReplyFieldDescriptor
} from '../lib/services/reply'

const replies = [
  {
    replyId: 'firstReplyId',
    replies: [
      { replyId: 'nestedReplyId', stars: 5 },
      {
        replyId: 'nestedReplyId2',
        replies: [
          { replyId: 'moreNestedReplyId2', replies: [{ replyId: 'mostNestedReplyEver' }] },
        ],
      },
    ]
  },
  { replyId: 'secondReplyId' },
  {
    replyId: 'thirdReplyId',
    replies: [
      { replyId: 'thirdNestedReplyId3' },
      { replyId: 'thirdNestedReplyId4' },
    ],
  },
]

Tinytest.add('Comments - Reply Service - getMongoReplyFieldDescriptor', function (test) {
  test.equal(getMongoReplyFieldDescriptor(replies, 'firstReplyId'), 'replies.0.replies')
  test.equal(getMongoReplyFieldDescriptor(replies, 'thirdReplyId'), 'replies.2.replies')
  test.equal(getMongoReplyFieldDescriptor(replies, 'secondReplyId'), 'replies.1.replies')
  test.equal(
    getMongoReplyFieldDescriptor(replies, 'thirdNestedReplyId3'),
    'replies.2.replies.0.replies',
  )
  test.equal(
    getMongoReplyFieldDescriptor(replies, 'moreNestedReplyId2'),
    'replies.0.replies.1.replies.0.replies',
  )
  test.equal(
    getMongoReplyFieldDescriptor(replies, 'mostNestedReplyEver'),
    'replies.0.replies.1.replies.0.replies.0.replies',
  )
  test.equal(getMongoReplyFieldDescriptor(replies, 'wootWoot'), '')
})

Tinytest.add('Comments - Reply Service - removeReplyByReplyId', function (test) {
  test.equal(removeReplyByReplyId(replies, 'firstReplyId')[0].replyId, 'secondReplyId')
  test.equal(removeReplyByReplyId(replies, 'firstReplyId')[1].replies[0].replyId, 'thirdNestedReplyId3')
  test.equal(removeReplyByReplyId(replies, 'firstReplyId').length, 2)

  test.equal(removeReplyByReplyId(replies, 'thirdNestedReplyId3')[0].replyId, 'firstReplyId')
  test.equal(removeReplyByReplyId(replies, 'thirdNestedReplyId3')[2].replyId, 'thirdReplyId')
  test.equal(removeReplyByReplyId(replies, 'thirdNestedReplyId3')[2].replies[0].replyId, 'thirdNestedReplyId4')
  test.equal(removeReplyByReplyId(replies, 'thirdNestedReplyId3')[2].replies.length, 1)
  test.equal(removeReplyByReplyId(replies, 'thirdNestedReplyId3')[0].replies[1].replies[0].replies.length, 1)
  test.equal(removeReplyByReplyId(replies, 'mostNestedReplyEver')[0].replies[1].replies[0].replies.length, 0)

  test.equal(
    removeReplyByReplyId(replies, 'firstReplyId', reply => false)[0].replyId,
    'firstReplyId'
  )

  test.equal(
    removeReplyByReplyId(replies, 'firstReplyId', reply => reply.replyId === 'firstReplyId')[0].replyId,
    'secondReplyId'
  )

  test.equal(
    removeReplyByReplyId(replies, 'nestedReplyId', reply => reply.stars === 5)[0].replies[0].replyId,
    'nestedReplyId2'
  )

  test.equal(
    removeReplyByReplyId(replies, 'nestedReplyId', reply => reply.stars === 4)[0].replies[0].replyId,
    'nestedReplyId'
  )
})

Tinytest.add('Comments - Reply Service - adjustReplyByReplyId', function (test) {
  const clonedReplies = JSON.parse(JSON.stringify(replies))

  adjustReplyByReplyId(clonedReplies, 'mostNestedReplyEver', reply => reply.awesome = true)
  adjustReplyByReplyId(clonedReplies, 'thirdNestedReplyId4', reply => reply.alsoAwesome = true)
  adjustReplyByReplyId(clonedReplies, 'moreNestedReplyId2', reply => reply.kindaNested = true)
  adjustReplyByReplyId(clonedReplies, 'nonEsistant', reply => test.fail())

  test.equal(clonedReplies[0].replies[1].replies[0].replies[0].awesome, true)
  test.equal(clonedReplies[2].replies[1].alsoAwesome, true)
  test.equal(clonedReplies[0].replies[1].replies[0].kindaNested, true)
})
