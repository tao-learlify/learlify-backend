import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { Router, Readonly } from 'decorators'
import { ScheduleController } from './schedule.controller'
import { GlobalPipe } from 'pipe'
import { pipe } from './schedule.pipe'
import { Roles } from 'metadata/roles'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'schedules',
  route: '/schedule'
})
class Schedule {
  constructor() {
    this.controller = new ScheduleController()
    this.logger = Logger.Service
  }

  /**
   * @returns {HttpConsumer}
   */
  @Readonly
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /schedule')
    }

    /**
     * @description
     * Get all schedules with his retrieve parameters.
     * @method GET
     */
    this.schedules.get(
      '/',
      [
        Middleware.authenticate,
        pipe.getAll,
        Middleware.usePipe,
        Middleware.timezone
      ],
      Middleware.secure(this.controller.getAll)
    )

    this.schedules.get(
      '/stream',
      [
        Middleware.authenticate,
        Middleware.timezone
      ],
      Middleware.secure(this.controller.earlyStream)
    )

    /**
     * @description
     * Deletes a resource from schedule.
     * Only can be consumed
     * @method DELETE
     */
    this.schedules.delete(
      '/:id',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.remove,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.remove)
    )

    /**
     * @description
     * Creates a new schedule assigning his startDate and endDate.
     * @method POST
     */
    this.schedules.post(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        Middleware.LanguageGuard,
        GlobalPipe.startDate,
        GlobalPipe.endDate,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.create)
    )

    return this.consumer
  }
}

export default new Schedule().httpConsumer()
