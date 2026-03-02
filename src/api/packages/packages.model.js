import { Model } from 'objection'
/**
 * @alias relations
 */
import User from 'api/users/users.model'
import Plan from 'api/plans/plans.model'

class Package extends Model {
  static get tableName() {
    return 'packages'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      required: ['userId', 'planId', 'expirationDate', 'writings', 'speakings'],

      properties: {
        id: { type: 'integer' },
        total: { type: 'integer' },
        isActive: { type: 'boolean' },
        expirationDate: { type: 'date' },
        stripeChargeId: { type: 'string' },
        userId: { type: 'integer' },
        planId: { type: 'integer' },
        speakings: { type: 'integer' },
        writings: { type: 'integer' }
      }
    }
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'packages.userId',
          to: 'users.id'
        }
      },
      plan: {
        relation: Model.HasOneRelation,
        modelClass: Plan,
        join: {
          from: 'packages.planId',
          to: 'plans.id'
        }
      }
    }
  }
}

export default Package
