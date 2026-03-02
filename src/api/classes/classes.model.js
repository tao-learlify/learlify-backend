import { Model } from 'objection'
import Schedule from 'api/schedule/schedule.model'
import Meeting from 'api/meetings/meetings.model'

class Classes extends Model {
  static get tableName() {
    return 'classes'
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
        id: { type: 'integer' },
        scheduleId: { type: 'integer' }
      }
    }
  }

  /**
   * @returns {import('objection').RelationMappings}
   */
  static get relationMappings() {
    return {
      schedule: {
        relation: Model.HasOneRelation,
        modelClass: Schedule,
        join: {
          from: 'classes.scheduleId',
          to: 'schedule.id'
        }
      },

      meetings: {
        relation: Model.HasManyRelation,
        modelClass: Meeting,
        join: {
          from: 'classes.id',
          to: 'meetings.classId'
        }
      }
    }
  }

  /**
   * @returns {import('objection').Modifiers}
   */
  static get modifiers() {
    return {
      withClassName(builder) {
        builder.select(['id', 'name', 'expired'])
      },

      active (builder) {
        builder.select(['id', 'name', 'expired'])
      },

      activeWithNoExpiration (builder) {
        builder.select(['name', 'expired'])
      }
    }
  }
}

export default Classes
