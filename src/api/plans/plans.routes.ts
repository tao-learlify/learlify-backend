import { Router } from 'express'
import { Logger } from 'api/logger'
import { PlansController } from './plans.controller'
import { Middleware } from 'middlewares'
import { pipe } from './plans.pipe'
import { Roles } from 'metadata/roles'
import { isRunningOnProductionOrDevelopment } from 'functions'
import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'

class PlansRouter {
  private plans: ExpressRouter
  private logger: typeof Logger.Service
  private controller: PlansController

  constructor() {
    this.plans = Router()
    this.logger = Logger.Service
    this.controller = new PlansController()
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /plans')
    }

    this.plans.get(
      '/',
      [Middleware.authenticate] as RequestHandler[],
      pipe.getAll as unknown as RequestHandler,
      Middleware.usePipe as RequestHandler,
      Middleware.GeoLocationGuard as RequestHandler,
      Middleware.secure(this.controller.getAll) as RequestHandler
    )

    this.plans.put(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.update,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.updateOne) as RequestHandler
    )

    this.plans.get(
      '/:id',
      [Middleware.authenticate, pipe.findOne, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.findOne) as RequestHandler
    )

    this.plans.post(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.create,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.create) as RequestHandler
    )

    this.plans.delete(
      '/:id',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.remove,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.remove) as RequestHandler
    )

    return {
      route: '/plans',
      handlers: this.plans
    }
  }
}

export default new PlansRouter().httpConsumer()
