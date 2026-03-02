import { Model } from 'objection'
import Advance from 'api/advance/advance.model'
import View from 'api/views/views.model'
import Models from 'api/models/models.model'


class Course extends Model {
  /**
   * @returns {string}
   */
  static get tableName () {
    return 'courses'
  }

  /**
   * @returns {string}
   */
  static get idColumn () {
    return 'id'
  }

  /**
   * @returns {import('objection').JsonSchema}
   */
  static get jsonSchema () {
    return {
      type: 'object',
      properties: {
        id: { type: 'integer' }
      }
    } 
  }

  /**
   * @returns {import('objection').RelationMappings}
   */
  static get relationMappings () {
    return {
      views: {
        modelClass: View,
        relation: Model.HasOneRelation,
        join: {
          from: 'courses.id',
          to: 'views.courseId'
        }
      },

      advance: {
        modelClass: Advance,
        relation: Model.HasManyRelation,
        join: {
          from: 'courses.id',
          to: 'advance.courseId'
        }
      },


      model: {
        modelClass: Models,
        relation: Model.HasOneRelation,
        join: {
          from: 'courses.modelId',
          to: 'exam_models.id'
        }
      }
    }
  }

  static get modifiers () {
    return {
      clientAttributes (sql) {
        sql.select(['createdAt', 'id'])
      }
    }
  }
}


export default Course