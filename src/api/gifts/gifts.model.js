import { Model } from 'objection'
import User from 'api/users/users.model'
import Plan from 'api/plans/plans.model'

class Gift extends Model {
  static get tableName() {
    return 'gifts'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'intger' },
        email: { type: 'string' },
        gifter: { type: 'integer ' },
        planId: { type: 'integer' },
        serial: { type: 'string ' },
        expired: { type: 'boolean' }
      }
    }
  }

  static get relationMappings() {
    return {
      users: {
        modelClass: User,
        relation: Model.HasOneRelation,
        join: {
          from: 'gifts.gifter',
          to: 'users.id'
        }
      },

      plans: {
        modelClass: Plan,
        relation: Model.HasOneRelation,
        join: {
          from: 'gifts.planId',
          to: 'plans.id'
        }
      }
    }
  }
}

export default Gift
