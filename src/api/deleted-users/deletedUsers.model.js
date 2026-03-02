import { Model } from 'objection'

/**
 * DeletedUser Model
 * @class DeletedUser
 * @extends {Model}
 */

class DeletedUser extends Model {
  static get tableName() {
    return 'deleted_users'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      required: ['userId', 'email', 'firstName', 'lastName'],

      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        email: { type: 'string', maxLength: 255 },
        firstName: { type: 'string', minLength: 1, maxLength: 30 },
        lastName: { type: 'string', minLength: 1, maxLength: 30 }
      }
    }
  }
}

export default DeletedUser
