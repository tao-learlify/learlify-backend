import Role from './roles.model'

export class RolesService {
  constructor () {
    this.clientAttributes = ['name']
  }

  /**
   * @param {{ id?: number, name?: string }}
   * @returns {Promise<Role>} 
   */
  findOne ({ id, name }) {
    if (id) {
      return Role.query().findById(id)
    }
    return Role.query().findOne({ name })
  }

  /**
   * @returns {Promise<Role []>}
   */
  getAll () {
    const attributes = this.clientAttributes

    return Role.query().select(attributes)
  }
}