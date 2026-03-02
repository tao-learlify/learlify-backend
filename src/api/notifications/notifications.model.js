import { Model } from 'objection'
import NotificationType from 'api/notification-types/notificationTypes.model'

class Notification extends Model {
  static get tableName() {
    return 'notifications'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      required: ['userId'],

      properties: {
        id: { type: 'integer' },
        senderId: { type: 'integer' },
        userId: { type: 'integer' },
        message: { type: 'string' },
        read: { type: 'boolean' },
        deleted: { type: 'boolean' },
        type: { type: 'integer' }
      }
    }
  }

  static relationMappings = {
    notificationType: {
      relation: Model.BelongsToOneRelation,
      modelClass: NotificationType,
      join: {
        from: 'notifications.type',
        to: 'notification_types.id'
      }
    }
  }
}

export default Notification
