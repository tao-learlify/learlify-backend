import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { UsersController } from './users.controller'
import { pipe } from './users.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'


@Router({
  alias: 'users',
  route: '/users'
})
class UsersRouter {
  constructor() {
    this.controller = new UsersController()
    this.logger = Logger.Service
  }

  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /users')
    }

    this.users.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    this.users.get(
      '/:id',
      [Middleware.authenticate, pipe.getOne, Middleware.usePipe],
      Middleware.secure(this.controller.getOne),
      Middleware.secure(this.controller.getTour)
    )

    this.users.put(
      '/',
      [Middleware.authenticate, pipe.updateOne, Middleware.usePipe],
      Middleware.secure(this.controller.updateOne),
    )

    this.users.put(
      '/tour',
      [Middleware.authenticate, pipe.updateTour, Middleware.usePipe],
      Middleware.secure(this.controller.updateTour)
    )

    return this.consumer
  }
}

export default new UsersRouter().httpConsumer()
