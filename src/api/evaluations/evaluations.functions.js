/**
 * @param {{}} evaluation
 * @returns {{}}
 */
export function removeOldDataPlugin(evaluation) {
  if (evaluation.resultsJSON) {
    const parse = evaluation.resultsJSON

    parse.forEach(value => {
      if (value?.user) {
        delete value.user.isVerified
        delete value.user.createdAt
        delete value.user.updatedAt
        delete value.user.password
        delete value.user.token
        delete value.user.imageUrl
        delete value.user.roleId
        delete value.user.stripeCustomerId
        delete value.user.googleId
        delete value.user.facebookId
        delete value.user.lastLogin
      }
  
      if (value?.teacher) {
        delete value.teacher.isVerified
        delete value.teacher.createdAt
        delete value.teacher.updatedAt
        delete value.teacher.password
        delete value.teacher.token
        delete value.teacher.imageUrl
        delete value.teacher.roleId
        delete value.teacher.stripeCustomerId
        delete value.teacher.googleId
        delete value.teacher.facebookId
        delete value.teacher.lastLogin
      }
  
      delete value.category.createdAt
      delete value.category.updatedAt
    })
  
    return {
      ...evaluation,
      resultsJSON: parse
    }
  }
  return evaluation
}
