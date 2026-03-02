import { Model } from 'objection'
import Progress from 'api/progress/progress.model'
import Stats from 'api/stats/stats.model'
import Models from 'api/models/models.model'
import Evaluation from 'api/evaluations/evaluations.model'

class Exam extends Model {
  static get tableName() {
    return 'exams'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        createdAt: { type: 'string' }
      }
    }
  }

  static get relationMappings() {
    return {
      progress: {
        relation: Model.HasManyRelation,
        modelClass: Progress,
        join: {
          from: 'exams.id',
          to: 'progress.examId'
        }
      },

      stats: {
        relation: Model.HasManyRelation,
        modelClass: Stats,
        join: {
          from: 'exams.id',
          to: 'stats.examId'
        }
      },

      model: {
        relation: Model.BelongsToOneRelation,
        modelClass: Models,
        join: {
          from: 'exams.examModelId',
          to: 'exam_models.id'
        }
      },

      evalaution: {
        relation: Model.HasOneRelation,
        modelClass: Evaluation,
        join: {
          from: 'exams.id',
          to: 'evaluations.examId'
        }
      }
    }
  }

  /**
   * @returns {import ('objection').Modifiers}
   */
  static get modifiers() {
    return {
      stats(builder) {
        builder.select(['id'])
      },

      name(builder) {
        builder.select(['name'])
      },

      clientAttributes(builder) {
        builder.select(['id', 'name', 'dir', 'requiresPayment', 'version'])
      },

      model(builder) {
        builder.withGraphFetched({ model: true })
      }
    }
  }
}

export default Exam
