import { Model } from 'objection'
import Course from 'api/courses/courses.model'

class View extends Model {
  static get idColumn() {
    return 'id'
  }

  static get tableName() {
    return 'views'
  }

  /**
   * @returns {import('objection').JsonSchema}
   */
  static get jsonSchema() {
    return {
      type: 'object',

      required: ['url', 'courseId'],

      properties: {
        id: { type: 'integer' },
        url: { type: 'string' },
        courseId: { type: 'integer' }
      }
    }
  }

  /**
   * @returns {import('objection').RelationMappings}
   */
  static get relationMappings() {
    return {
      courses: {
        relation: Model.HasOneRelation,
        modelClass: Course,
        join: {
          from: 'views.courseId',
          to: 'courses.id'
        }
      }
    }
  }

  static get modifiers () {
    return {
      token (sql) {
        sql.select(['url', 'createdAt'])
      }
    }
  }
}

export default View
