import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { AdvanceController } from './advance.controller'
import { pipe } from './advance.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'advance',
  route: '/advance'
})
class AdvanceRouter {
  constructor() {
    this.controller = new AdvanceController()
    this.logger = Logger.Service
  }

  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /advance')
    }

    this.advance.get(
      '/',
      [Middleware.authenticate, pipe.create, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    this.advance.post(
      '/',
      [Middleware.authenticate, pipe.create, Middleware.usePipe],
      Middleware.secure(this.controller.create)
    )

    this.advance.put(
      '/',
      [Middleware.authenticate, pipe.update, Middleware.usePipe],
      Middleware.secure(this.controller.updateOne)
    )

    return this.consumer
  }
}

export default new AdvanceRouter().httpConsumer()
