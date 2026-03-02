import { CronSchedule, Bind } from 'decorators'
import { Logger } from 'api/logger'
import { NotificationsService } from 'api/notifications/notifications.service'

@CronSchedule
class NotificationsTasks {
  constructor() {
    this.logger = Logger.Service
    this.notificationsService = new NotificationsService()
  }

  @Bind
  deleteExpired() {
    this.trigger.schedule('0 */12 * * *', async () => {
      try {
        await this.notificationsService.deleteExpired()
      } catch (err) {
        this.logger.error(err.name)
        this.logger.error(err.stack)
      }
    })
  }
}

export default NotificationsTasks