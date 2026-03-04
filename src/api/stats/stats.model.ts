import { Model } from 'objection'
import type { JSONSchema, RelationMappings, ModelClass } from 'objection'
import User from 'api/users/users.model'
import Category from 'api/categories/categories.model'
import Exam from 'api/exams/exams.model'
import Evaluation from 'api/evaluations/evaluations.model'

class Stats extends Model {
  id!: number
  categoryId!: number
  examId?: number
  userId?: number
  points?: number
  bandScore?: number
  marking?: string
  evaluationId?: number
  createdAt?: string
  updatedAt?: string

  static get tableName(): string {
    return 'stats'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
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

  static get relationMappings(): RelationMappings {
    return {
      evaluation: {
        relation: Model.HasOneRelation,
        modelClass: Evaluation as unknown as ModelClass<Model>,
        join: {
          from: 'stats.evaluationId',
          to: 'evaluations.id'
        }
      },

      user: {
        relation: Model.HasOneRelation,
        modelClass: User as unknown as ModelClass<Model>,
        join: {
          from: 'stats.userId',
          to: 'users.id'
        }
      },

      category: {
        relation: Model.HasOneRelation,
        modelClass: Category as unknown as ModelClass<Model>,
        join: {
          from: 'stats.categoryId',
          to: 'category.id'
        }
      },

      exam: {
        relation: Model.HasOneRelation,
        modelClass: Exam as unknown as ModelClass<Model>,
        join: {
          from: 'stats.examId',
          to: 'exams.id'
        }
      }
    }
  }
}

export default Stats
