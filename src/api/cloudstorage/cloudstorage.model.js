import { Model } from 'objection'

/**
 * @alias relations
 */
import User from '../users/users.model'

class CloudStorage extends Model {
  static get tableName() {
    return 'cloudstorage'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        bucket: { type: 'string' },
        location: { type: 'string' },
        ETag: { type: 'string' },
        key: { type: 'string' },
        userId: { type: 'integer' },
      }
    }
  }

  static get relationMappings() {
    return {
      users: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'cloudstorage.userId',
          to: 'users.id'
        }
      }
    }
  }
}

export default CloudStorage