import { Model } from 'objection'
import Schedule from 'api/schedule/schedule.model'

class Language extends Model {
  static get tableName() {
    return 'languages'
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
        lang: { type: 'string' }
      }
    }
  }

  /**
   * @returns {import('objection').RelationMappings}
   */
  static get relationMappings() {
    return {
      schedules: {
        relation: Model.HasManyRelation,
        modelClass: Schedule,
        join: {
          from: 'languages.id',
          to: 'schedule.langId'
        }
      }
    }
  }
}

export default Language
