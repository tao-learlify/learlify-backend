import { Bind } from 'decorators'
import NotificationType from './notificationTypes.model'
import { Logger } from 'api/logger'

export class NotificationTypesService {
  constructor() {
    this.logger = Logger.Service
  }

  @Bind
  create(access) {
    return NotificationType.query().insertAndFetch(access)
  }

  @Bind
  getAll() {
    return NotificationType.query()
  }

  @Bind
  async getOne(type) {
    const [result] = await NotificationType.query().where(type).limit(1)
    return result
  }

  @Bind
  updateOne(id, data) {
    return NotificationType.query().patchAndFetchById(id, data)
  }
}
