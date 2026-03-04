import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { AccessController } from './access.controller'
import { pipe } from './access.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import { Roles } from 'metadata/roles'

@Router({
  alias: 'access',
  route: '/access'
})
class AccessRouter {
  declare access: ExpressRouter
  declare consumer: HttpConsumer
  private controller: AccessController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new AccessController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /access')
    }

    this.access.post(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.create,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.create)
    )

    this.access.get(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.getAll,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.getAll)
    )

    this.access.get(
      '/:id',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.getOne,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.getOne)
    )

    this.access.put(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.updateOne,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.updateOne)
    )

    return this.consumer
  }
}

export default new AccessRouter().httpConsumer()
