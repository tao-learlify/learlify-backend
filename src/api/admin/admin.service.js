import User from 'api/users/users.model'

/**
 * @typedef {Object} UserSource
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} password
 */

export class AdminService {
  /**
   * @param {UserSource} user
   * @param {{}} trx
   * @returns {Promise<User>}
   */
  createUser (user, trx) {
    const transaction = Object.assign({}, user, { isVerified: true })

    return User.query(trx).insertAndFetch(transaction)
  }


  /**
   * @param {string} email
   * @returns {Promise<boolean>} 
   */
  async userExist (email) {
    const user = await User.query().findOne({
      email
    })

    return Boolean(user) 
  }
}