import { Model, JSONSchema } from 'objection'

class PushSubscription extends Model {
  id!: number
  userId!: number
  endpoint!: string
  p256dh!: string
  auth!: string

  static get tableName(): string {
    return 'push_subscriptions'
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['userId', 'endpoint', 'p256dh', 'auth'],
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        endpoint: { type: 'string' },
        p256dh: { type: 'string' },
        auth: { type: 'string' }
      }
    }
  }
}

export default PushSubscription
