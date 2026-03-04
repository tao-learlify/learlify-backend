import type { Router as ExpressRouter } from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { Router, Readonly } from 'decorators'
import type { HttpConsumer } from '@types'
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
  controller: ScheduleController
  logger: typeof Logger.Service
  declare schedules: ExpressRouter
  declare consumer: HttpConsumer

  constructor() {
    this.controller = new ScheduleController()
    this.logger = Logger.Service
  }

  @Readonly
  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /schedule')
    }

    this.schedules.get(
      '/',
      [
        Middleware.authenticate,
        pipe.getAll as never,
        Middleware.usePipe,
        Middleware.timezone
      ],
      Middleware.secure(this.controller.getAll)
    )

    this.schedules.get(
      '/stream',
      [Middleware.authenticate, Middleware.timezone],
      Middleware.secure(this.controller.earlyStream)
    )

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
