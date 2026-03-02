import { Model } from 'objection'

import Evaluation from 'api/evaluations/evaluations.model'
import Stats from 'api/stats/stats.model'

class Category extends Model {
  static get tableName() {
    return 'category'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      required: ['name'],

      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    }
  }

  static get relationMappings() {
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

  static get modifiers () {
    return {
      name (builder) {
        builder.select(['id', 'name'])
      }
    }
  }
}

export default Category
