import { Model } from 'objection'

import User from 'api/users/users.model'
import Exam from 'api/exams/exams.model'

class Progress extends Model {
  static get tableName() {
    return 'progress'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    
    return {
      required: [],
      type: 'object',
      properties: {
        id: { type: 'integer' },
        examId: { type: 'integer' },
        userId: { type: 'integer' },
        data: { type: 'object' }
      }
    }
  }

  static get relationMappings() {
    return {
      exam: {
        relation: Model.HasOneRelation,
        modelClass: Exam,
        join: {
          from: 'progress.examId',
          to: 'exams.id'
        }
      },

      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'progress.userId',
          to: 'users.id'
        }
      }
    }
  }

  static get modifiers() {
    return {
      exam(builder) {
        return builder.select(['data'])
      }
    }
  }
}

export default Progress
