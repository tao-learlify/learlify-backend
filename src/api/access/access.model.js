import { Model } from 'objection'
import FEATURES from './access.features'

class Access extends Model {
  static get tableName() {
    return 'access'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      required: ['planId', 'feature'],

      properties: {
        id: { type: 'integer' },
        planId: { type: 'integer' },
        feature: { type: 'string', enum: Object.values(FEATURES) }
      }
    }
  }

  static get modifiers () {
    return {
      clientAttributes (builder) {
        builder.select(['feature', 'createdAt'])
      }
    }
  }
}

export default Access
