import { Model } from 'objection'

export default class NotificationType extends Model {
  static get tableName() {
    return 'notification_types'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        template: { type: 'string' }
      }
    }
  }
}
