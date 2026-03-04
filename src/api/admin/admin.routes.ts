import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { Roles } from 'metadata/roles'
import { pipe } from './admin.pipe'
import { AdminController } from './admin.controller'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'admin',
  route: '/admin'
})
class AdminRouter {
  declare admin: ExpressRouter
  declare consumer: HttpConsumer
  private controller: AdminController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new AdminController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /admin')
    }

    this.admin.post(
      '/create-user',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.createUser,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.createUser)
    )

    this.admin.get(
      '/info-user',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.viewInfo,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.viewUserInfo)
    )

    return this.consumer
  }
}

export default new AdminRouter().httpConsumer()
