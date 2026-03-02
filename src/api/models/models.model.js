import Course from 'api/courses/courses.model'
import Plan from 'api/plans/plans.model'
import User from 'api/users/users.model'
import { Model } from 'objection'

class Models extends Model {
  static get tableName () {
    return 'exam_models'
  }


  static get jsonSchema () {
    return {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    }
  }


  /**
   * @returns {import ('objection').Modifiers}
   */
  static get modifiers () {
    return {
      clientAttributes (builder) {
        builder.select(['*'])
      },

      token (builder) {
        builder.select(['id', 'name'])
      }
    }
  }
  /**
   * @returns {import ('objection').RelationMappings}
   */
  static get relationMappings() {
    return {
      users: {
        modelClass: User,
        relation: Model.HasManyRelation,
        join: {
          from: 'exams_models.id',
          to: 'users.id'
        }
      },

      plans: {
        modelClass: Plan,
        relation: Model.HasManyRelation,
        join: {
          from: 'exams_models.id',
          to: 'plans.modelId'
        }
      },

      courses: {
        modelClass: Course,
        relation: Model.HasManyRelation,
        join: {
          from: 'exams_models.id',
          to: 'courses.modelId'
        }
      }
    }
  }
}

export default Models