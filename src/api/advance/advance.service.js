import Advance from './advance.model'

/**
 * @typedef {Object} Source
 * @property {number} courseId
 * @property {number} userId
 */

export class AdvanceService {
  /**
   * @param {Source} advance
   * @returns {Promise<Advance>}
   */
  create (advance) {
    return Advance.query().insertAndFetch(advance)
  }

  /**
   * @param {Source} advance 
   * @returns {Promise<Advance>}
   */
  getOne (advance) {
    return Advance.query().findOne(advance)
  }

  /**
   * @param {{ id?: number, advance: Source }}
   */
  updateOne ({ id, ...advance }) {
    return Advance.query().patchAndFetchById(id, advance)
  }
}