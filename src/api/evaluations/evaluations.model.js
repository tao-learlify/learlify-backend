import { Model } from 'objection'

/**
 * @requires [models]
 */
import Progress from 'api/progress/progress.model'
import User from 'api/users/users.model'
import Category from 'api/categories/categories.model'
import Exam from 'api/exams/exams.model'
import Stats from 'api/stats/stats.model'

class Evaluation extends Model {
  static get tableName() {
    return 'evaluations'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      required: [],

      properties: {
        id: {
          type: 'integer'
        },
        data: {
          type: 'object'
        },
        examId: {
          type: 'integer'
        },
        userId: {
          type: 'integer'
        },
        teacherId: {
          oneOf: [{ type: 'integer' }, { type: 'null' }]
        },
        progressId: {
          type: 'integer'
        },
        categoryId: {
          type: 'integer'
        },
        comments: {
          type: 'string'
        },
        status: {
          type: 'string'
        }
      }
    }
  }

  static get relationMappings() {
    return {
      exam: {
        relation: Model.HasOneRelation,
        modelClass: Exam,
        join: {
          from: 'evaluations.examId',
          to: 'exams.id'
        }
      },

      teacher: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'evaluations.teacherId',
          to: 'users.id'
        }
      },

      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'evaluations.userId',
          to: 'users.id'
        }
      },

      category: {
        relation: Model.HasOneRelation,
        modelClass: Category,
        join: {
          from: 'evaluations.categoryId',
          to: 'category.id'
        }
      },

      progress: {
        relation: Model.HasOneRelation,
        modelClass: Progress,
        join: {
          from: 'evaluations.progressId',
          to: 'progress.id'
        }
      },

      stats: {
        relation: Model.HasOneRelation,
        modelClass: Stats,
        join: {
          from: 'evaluations.id',
          to: 'stats.evaluationId'
        }
      }
    }
  }
}

export default Evaluation
