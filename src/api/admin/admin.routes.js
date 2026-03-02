import { Router } from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { Roles } from 'metadata/roles'
import { pipe } from './admin.pipe'
import { AdminController } from './admin.controller'
import { isRunningOnProductionOrDevelopment } from 'functions'

export class AdminRouter {
  constructor() {
    this.admin = Router()
    this.controller = new AdminController()
    this.logger = Logger.Service
  }

  httpConsumer() {
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
      ],
      Middleware.secure(this.controller.createUser)
    )

    this.admin.get(
      '/info-user',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.viewInfo,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.viewUserInfo)
    )

    return {
      route: '/admin',
      handlers: this.admin
    }
  }
}

export default new AdminRouter().httpConsumer()
