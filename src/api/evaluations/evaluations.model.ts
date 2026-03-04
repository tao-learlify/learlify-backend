import { Model, type JSONSchema, type RelationMappings, type ModelClass } from 'objection'
import Progress from 'api/progress/progress.model'
import User from 'api/users/users.model'
import Category from 'api/categories/categories.model'
import Exam from 'api/exams/exams.model'
import Stats from 'api/stats/stats.model'

class Evaluation extends Model {
  id!: number
  data?: Record<string, unknown>
  examId?: number
  userId?: number
  teacherId?: number | null
  progressId?: number
  categoryId?: number
  comments?: string
  status?: string

  static get tableName(): string {
    return 'evaluations'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
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

  static get relationMappings(): RelationMappings {
    return {
      exam: {
        relation: Model.HasOneRelation,
        modelClass: Exam as unknown as ModelClass<Model>,
        join: {
          from: 'evaluations.examId',
          to: 'exams.id'
        }
      },

      teacher: {
        relation: Model.HasOneRelation,
        modelClass: User as unknown as ModelClass<Model>,
        join: {
          from: 'evaluations.teacherId',
          to: 'users.id'
        }
      },

      user: {
        relation: Model.HasOneRelation,
        modelClass: User as unknown as ModelClass<Model>,
        join: {
          from: 'evaluations.userId',
          to: 'users.id'
        }
      },

      category: {
        relation: Model.HasOneRelation,
        modelClass: Category as unknown as ModelClass<Model>,
        join: {
          from: 'evaluations.categoryId',
          to: 'category.id'
        }
      },

      progress: {
        relation: Model.HasOneRelation,
        modelClass: Progress as unknown as ModelClass<Model>,
        join: {
          from: 'evaluations.progressId',
          to: 'progress.id'
        }
      },

      stats: {
        relation: Model.HasOneRelation,
        modelClass: Stats as unknown as ModelClass<Model>,
        join: {
          from: 'evaluations.id',
          to: 'stats.evaluationId'
        }
      }
    }
  }
}

export default Evaluation
