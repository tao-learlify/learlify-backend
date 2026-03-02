import { Model } from 'objection'
import Gift from 'api/gifts/gifts.model'
import Access from 'api/access/access.model'
import Models from 'api/models/models.model'

class Plan extends Model {
  static get tableName() {
    return 'plans'
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
        classes: { type: 'integer' },
        description: { type: 'string', maxLength: 512 },
        currency: { type: 'string', maxLength: 3 },
        writing: { type: 'integer' },
        speaking: { type: 'integer' },
        price: { type: 'integer' },
        feature: { type: 'string', enum: ['COURSES', 'CLASSES', 'EXAMS'] }
      }
    }
  }

  static get relationMappings() {
    return {
      gifts: {
        modelClass: Gift,
        relation: Model.HasOneRelation,
        join: {
          from: 'plans.id',
          to: 'gifts.planId'
        }
      },
      access: {
        modelClass: Access,
        relation: Model.HasManyRelation,
        join: {
          from: 'plans.id',
          to: 'access.planId'
        }
      },
      model: {
        modelClass: Models,
        relation: Model.HasOneRelation,
        join: {
          from: 'plans.modelId',
          to: 'exam_models.id'
        }
      }
    }
  }

  /**
   * @returns {import ('objection').Modifiers}
   */
  static get modifiers() {
    return {
      name(builder) {
        builder.select(['name'])
      }
    }
  }
}

export default Plan
