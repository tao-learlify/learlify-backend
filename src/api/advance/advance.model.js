import { Model } from 'objection'

/**
 * Relations.
 */
import User from 'api/users/users.model'
import Course from 'api/courses/courses.model'

class Advance extends Model {
  static get tableName() {
    return 'advance'
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

      required: ['userId', 'courseId'],

      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        courseId: { type: 'integer' }, 
        content: { type: 'object' }
      }
    }
  }

  /**
   * @returns {import('objection').RelationMappings}
   */
  static get relationMappings() {
    return {
      users: {
        modelClass: User,
        relation: Model.BelongsToOneRelation,
        join: {
          from: 'advance.userId',
          to: 'users.id'
        }
      },

      courses: {
        modelClass: Course,
        relation: Model.HasManyRelation,
        join: {
          from: 'advance.courseId',
          to: 'courses.id'
        }
      }
    }
  }
}

export default Advance
