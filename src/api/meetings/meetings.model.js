import { Model } from 'objection'
import Classes from 'api/classes/classes.model'
import User from 'api/users/users.model'

class Meeting extends Model {
  static get tableName() {
    return 'meetings'
  }

  static get idColumn() {
    return 'id'
  }

  /**
   * @returns {import('objection').JsonSchema}
   */
  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' }
      }
    }
  }

  /**
   * @returns {import ('objection').RelationMappings}
   */
  static get relationMappings() {
    return {
      classes: {
        modelClass: Classes,
        relation: Model.HasManyRelation,
        join: {
          from: 'meetings.classId',
          to: 'classes.id'
        }
      },

      user: {
        modelClass: User,
        relation: Model.HasOneRelation,
        join: {
          from: 'meetings.userId',
          to: 'users.id'
        }
      }
    }
  }

  /**
   * @returns {import ('objection').Modifiers}
   */
  static get modifiers() {
    return {
      withData(builder) {
        builder.select(['closed', 'timezone']).withGraphFetched({
          user: {
            $modify: ['withName']
          }
        })
      },

      withUser (builder) {
        builder.select(['closed, userId'])
      }
    }
  }
}

export default Meeting
