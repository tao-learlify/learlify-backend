import { Model, type JSONSchema, type Modifiers, type QueryBuilder } from 'objection'
import FEATURES from './access.features'

class Access extends Model {
  id!: number
  planId!: number
  feature!: string
  createdAt?: string

  static get tableName(): string {
    return 'access'
  }

  static get jsonSchema(): JSONSchema {
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

  static get modifiers(): Modifiers {
    return {
      clientAttributes(builder: QueryBuilder<Access>) {
        builder.select(['feature', 'createdAt'])
      }
    }
  }
}

export default Access
