import { CronSchedule, Bind } from 'decorators'
import { Logger } from 'api/logger'
import { NotificationsService } from 'api/notifications/notifications.service'

type CronScheduleOptions = {
  timezone?: string
} & Record<string, unknown>

type CronTrigger = {
  schedule(
    expression: string,
    callback: () => void | Promise<void>,
    options?: CronScheduleOptions
  ): unknown
}

const isErrorLike = (
  value: unknown
): value is { name?: unknown; stack?: unknown } =>
  typeof value === 'object' && value !== null

@CronSchedule
class NotificationsTasks {
  private readonly logger = Logger.Service
  private readonly trigger!: CronTrigger

  private readonly notificationsService: NotificationsService

  constructor() {
    this.logger = Logger.Service
    this.notificationsService = new NotificationsService()
  }

  @Bind
  deleteExpired(): void {
    this.trigger.schedule(
      '0 */12 * * *',
      async (): Promise<void> => {
        try {
          await this.notificationsService.deleteExpired()
        } catch (err) {
          if (isErrorLike(err)) {
            this.logger.error(err.name)
            this.logger.error(err.stack)
            return
          }

          this.logger.error(undefined)
          this.logger.error(undefined)
        }
      }
    )
  }
}

export default NotificationsTasks
