import { Model, RelationMappings, JSONSchema, QueryBuilder } from 'objection'
import Evaluation from 'api/evaluations/evaluations.model'
import Stats from 'api/stats/stats.model'

class Category extends Model {
  id!: number
  name!: string

  static get tableName(): string {
    return 'category'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    }
  }

  static get relationMappings(): RelationMappings {
    return {
      evaluations: {
        relation: Model.HasOneRelation,
        modelClass: Evaluation,
        join: {
          from: 'evaluations.categoryId',
          to: 'category.id'
        }
      },
      stats: {
        relation: Model.HasManyRelation,
        modelClass: Stats,
        join: {
          from: 'stats.id',
          to: 'category.id'
        }
      }
    }
  }

  static get modifiers() {
    return {
      name(builder: QueryBuilder<Category>) {
        builder.select(['id', 'name'])
      }
    }
  }
}

export default Category
