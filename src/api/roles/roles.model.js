import { Model } from 'objection'
import User from 'api/users/users.model'

class Role extends Model {
  static get tableName() {
    return 'roles'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      id: { type: 'integer' },
      name: { type: 'string' }
    }
  }

  static get relationMappings() {
    return {
      users: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'roles.name',
          to: 'users.roleId'
        }
      }
    }
  }

  /**
   * @returns {import ('objection').Modifiers}
   */
  static get modifiers() {
    return {
      name(builder) {
        builder.select(['name'])
      }
    }
  }
}

export default Role
