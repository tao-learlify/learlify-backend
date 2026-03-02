import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { ReportController } from './report.controller'
import { pipe } from './report.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'report',
  route: '/report'
})
class ReportRouter {
  constructor() {
    this.controller = new ReportController()
    this.logger = Logger.Service
  }

  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /report')
    }

    this.report.post(
      '/',
      [Middleware.authenticate, pipe.create, Middleware.usePipe],
      Middleware.secure(this.controller.create)
    )

    this.report.post(
      '/quality',
      [Middleware.authenticate, pipe.quality, Middleware.usePipe],
      Middleware.secure(this.controller.quality)
    )

    return this.consumer
  }
}

export default new ReportRouter().httpConsumer()
