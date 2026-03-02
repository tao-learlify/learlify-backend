import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { ExamsController } from './exams.controller'
import { pipe } from './exams.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'


@Router({
  alias: 'exams',
  route: '/exams'
})
class ExamsRouter {
  constructor() {
    this.controller = new ExamsController()
    this.logger = Logger.Service
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /exams')
    }

    this.exams.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    this.exams.get(
      '/:id',
      [Middleware.authenticate, pipe.getOne, Middleware.usePipe],
      Middleware.secure(this.controller.findOne)
    )

    return this.consumer
  }
}

export default new ExamsRouter().httpConsumer()
