import { CronSchedule, Bind } from 'decorators'
import { Logger } from 'api/logger'
import { UsersService } from 'api/users/users.service'

@CronSchedule
class UsersTasks {
  constructor() {
    this.logger = Logger.Service
    this.usersService = new UsersService()
  }

  @Bind
  deleteInactive() {
    this.trigger.schedule('0 0 * * *', async () => {
      try {
        const total = await this.usersService.deleteInactive()
        this.logger.info('Inactive users successfully deleted')
        this.logger.debug('Total users affected: ', { total })
      } catch (error) {
        this.logger.error(error.name)
        this.logger.error(error.stack)
      }
    })
  }

  @Bind
  verifyUnverified() {
    this.trigger.schedule(
      '0 0 * * *',
      async () => {
        try {
          const total = await this.usersService.verifyUnverified()
          this.logger.info('Unverified users successfully verified')
          this.logger.debug('Total users affected: ', { total })
        } catch (error) {
          this.logger.error(error.name)
          this.logger.error(error.stack)
        }
      },
      {
        timezone: 'Europe/Madrid'
      }
    )
  }
}

export default UsersTasks
