import { CronSchedule, Bind } from 'decorators'
import type { CronTrigger } from 'decorators'
import { Logger } from 'api/logger'
import { UsersService } from 'api/users/users.service'

type ErrorLike = {
  name?: unknown
  stack?: unknown
}

@CronSchedule
class UsersTasks {
  private readonly logger: typeof Logger.Service
  private readonly usersService: UsersService
  trigger!: CronTrigger

  constructor() {
    this.logger = Logger.Service
    this.usersService = new UsersService()
  }

  @Bind
  async deleteInactive(): Promise<void> {
    this.trigger.schedule('0 0 * * *', async (): Promise<void> => {
      try {
        const total = await this.usersService.deleteInactive()
        this.logger.info('Inactive users successfully deleted')
        this.logger.debug('Total users affected: ', { total })
      } catch (error: unknown) {
        const current = error as ErrorLike
        this.logger.error(current.name)
        this.logger.error(current.stack)
      }
    })
  }

  @Bind
  async verifyUnverified(): Promise<void> {
    this.trigger.schedule(
      '0 0 * * *',
      async (): Promise<void> => {
        try {
          const total = await this.usersService.verifyUnverified()
          this.logger.info('Unverified users successfully verified')
          this.logger.debug('Total users affected: ', { total })
        } catch (error: unknown) {
          const current = error as ErrorLike
          this.logger.error(current.name)
          this.logger.error(current.stack)
        }
      },
      {
        timezone: 'Europe/Madrid'
      }
    )
  }
}

export default UsersTasks
