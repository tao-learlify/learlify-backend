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
  constructor() {
    this.controller = new CoursesController()
    this.logger = Logger.Service
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /courses')
    }

    /**
     * @description
     * Get all courses
     * @method GET
     */
    this.courses.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    /**
     * @description
     * Create a new inscription to a course
     * @method POST
     */
    this.courses.post(
      '/',
      [Middleware.authenticate, pipe.inscription, Middleware.usePipe],
      Middleware.secure(this.controller.inscription)
    )

    return this.consumer
  }
}

export default new CoursesRouter().httpConsumer()
