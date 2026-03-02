import { Model } from 'objection'
import User from 'api/users/users.model'
import Category from 'api/categories/categories.model'
import Exam from 'api/exams/exams.model'
import Evaluation from 'api/evaluations/evaluations.model'

class Stats extends Model {
  /**
   * @returns {string}
   */
  static get tableName() {
    return 'stats'
  }

  /**
   * @returns {string}
   */
  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      required: ['categoryId'],

      properties: {
        id: { type: 'integer' },
        categoryId: { type: 'integer' },
        examId: { type: 'integer' },
        userId: { type: 'integer' },
        points: { type: 'integer' },
      }
    }
  }

  static get relationMappings() {
    return {
      evaluation: {
        relation: Model.HasOneRelation,
        modelClass: Evaluation,
        join: {
          from: 'stats.evaluationId',
          to: 'evaluations.id'
        }
      },

      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'stats.userId',
          to: 'users.id'
        }
      },

      category: {
        relation: Model.HasOneRelation,
        modelClass: Category,
        join: {
          from: 'stats.categoryId',
          to: 'category.id'
        }
      },

      exam: {
        relation: Model.HasOneRelation,
        modelClass: Exam,
        join: {
          from: 'stats.examId',
          to: 'exams.id'
        }
      }
    }
  }
}

export default Stats