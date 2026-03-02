import { Model } from 'objection'
import Classes from 'api/classes/classes.model'
import Language from 'api/languages/languages.model'
import User from 'api/users/users.model'

class Schedule extends Model {
  static get tableName() {
    return 'schedule'
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

      required: ['langId', 'userId', 'modelId'],

      properties: {
        id: { type: 'integer' },
        langId: { type: 'integer' },
        userId: { type: 'integer' },
        modelId: { type: 'integer' }
      }
    }
  }

  /**
   * @returns {import('objection').RelationMappings}
   */
  static get relationMappings() {
    return {
      classes: {
        relation: Model.HasOneRelation,
        modelClass: Classes,
        join: {
          from: 'schedule.id',
          to: 'classes.scheduleId'
        }
      },

      language: {
        relation: Model.HasOneRelation,
        modelClass: Language,
        join: {
          from: 'schedule.langId',
          to: 'languages.id'
        }
      },

      teacher: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'schedule.userId',
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
      withClass(builder) {
        return builder
          .select([
            'id',
            'anticipatedStartDate',
            'startDate',
            'endDate',
            'notes',
            'taken',
            'notified',
            'streaming'
          ])
          .withGraphFetched({
            language: true,
            teacher: {
              $modify: ['withName']
            }
          })
      },

      withName(builder) {
        return builder.select(['email', 'firstName', 'lastName'])
      },

      activeFields(builder) {
        return builder.select(['id', 'taken', 'notified', 'streaming'])
      },

      stream(builder) {
        return builder.where({ streaming: true })
      }
    }
  }
}

export default Schedule
