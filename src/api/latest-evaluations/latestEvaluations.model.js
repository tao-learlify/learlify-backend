import { Model } from 'objection'

/**
 * @requires [models]
 */
import User from 'api/users/users.model'
import Category from 'api/categories/categories.model'

class LatestEvaluation extends Model {
  static get tableName() {
    return 'latest_evaluations'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
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
    }
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'latest_evaluations.userId',
          to: 'users.id'
        }
      },

      teacher: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'latest_evaluations.teacherId',
          to: 'users.id'
        }
      },

      category: {
        relation: Model.HasOneRelation,
        modelClass: Category,
        join: {
          from: 'latest_evaluations.categoryId',
          to: 'category.id'
        }
      }
    }
  }
}

export default LatestEvaluation