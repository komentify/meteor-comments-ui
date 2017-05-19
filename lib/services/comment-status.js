export const commentStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
}

export const validateCommentStatus = st => {
  const validStats = Object.values(commentStatuses)

  if (!validStats.includes(st)) {
    throw new Error(
      `Invalid comment status "${st}", use one of ${validStats.join(', ')}`
    )
  }
}
