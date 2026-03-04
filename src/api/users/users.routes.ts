import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { UsersController } from './users.controller'
import { pipe } from './users.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'

@Router({
  alias: 'users',
  route: '/users'
})
class UsersRouter {
  declare users: ExpressRouter
  declare consumer: HttpConsumer

  private controller: UsersController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new UsersController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /users')
    }

    this.users.get(
      '/',
      [Middleware.authenticate, ...pipe.getAll, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.getAll) as RequestHandler
    )

    this.users.get(
      '/:id',
      [Middleware.authenticate, ...pipe.getOne, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.getOne) as RequestHandler,
      Middleware.secure(this.controller.getTour) as RequestHandler
    )

    this.users.put(
      '/',
      [Middleware.authenticate, ...pipe.updateOne, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.updateOne) as RequestHandler,
    )

    this.users.put(
      '/tour',
      [Middleware.authenticate, ...pipe.updateTour, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.updateTour) as RequestHandler
    )

    return this.consumer
  }
}

export default new UsersRouter().httpConsumer()
