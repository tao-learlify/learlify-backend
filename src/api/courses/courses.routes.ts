import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { CoursesController } from './courses.controller'
import { pipe } from './courses.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'courses',
  route: '/courses'
})
class CoursesRouter {
  declare courses: ExpressRouter
  declare consumer: HttpConsumer
  private controller: CoursesController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new CoursesController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /courses')
    }

    this.courses.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.getAll)
    )

    this.courses.post(
      '/',
      [Middleware.authenticate, pipe.inscription, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.inscription)
    )

    return this.consumer
  }
}

export default new CoursesRouter().httpConsumer()
