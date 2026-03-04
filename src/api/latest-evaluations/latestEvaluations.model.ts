import { Model } from 'objection'
import type { JSONSchema, RelationMappings, ModelClass } from 'objection'
import User from 'api/users/users.model'
import Category from 'api/categories/categories.model'

class LatestEvaluation extends Model {
  id!: number
  userId?: number
  teacherId?: number | null
  categoryId?: number
  data?: Record<string, unknown>

  static get tableName(): string {
    return 'latest_evaluations'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',

      properties: {
        id: {
          type: 'integer'
        },
        userId: {
          type: 'integer'
        },
        teacherId: {
          oneOf: [{ type: 'integer' }, { type: 'null' }]
        },
        categoryId: {
          type: 'integer'
        },
        data: {
          type: 'object'
        }
      }
    } as JSONSchema
  }

  static get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User as unknown as ModelClass<Model>,
        join: {
          from: 'latest_evaluations.userId',
          to: 'users.id'
        }
      },

      teacher: {
        relation: Model.HasOneRelation,
        modelClass: User as unknown as ModelClass<Model>,
        join: {
          from: 'latest_evaluations.teacherId',
          to: 'users.id'
        }
      },

      category: {
        relation: Model.HasOneRelation,
        modelClass: Category as unknown as ModelClass<Model>,
        join: {
          from: 'latest_evaluations.categoryId',
          to: 'category.id'
        }
      }
    }
  }
}

export default LatestEvaluation
