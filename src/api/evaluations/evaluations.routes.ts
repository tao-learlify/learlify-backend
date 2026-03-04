import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { Roles } from 'metadata/roles'
import { EvaluationsController } from './evaluations.controller'
import { pipe } from './evaluations.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'evaluations',
  route: '/evaluations'
})
class EvaluationsRouter {
  declare evaluations: ExpressRouter
  declare consumer: HttpConsumer
  private controller: EvaluationsController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new EvaluationsController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /evaluations')
    }

    this.evaluations.put(
      '/:id',
      [
        Middleware.authenticate,
        Middleware.LanguageGuard,
        Middleware.RolesGuard([
          Roles.Admin,
          Roles.Teacher
        ]),
        pipe.update,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.updateOne)
    )

    this.evaluations.get(
      '/all',
      [
        Middleware.authenticate,
        pipe.getAll,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.getAll),
      Middleware.secure(this.controller.getCount)
    )

    this.evaluations.get(
      '/:id',
      [
        Middleware.authenticate,
        pipe.getOne,
        Middleware.usePipe
      ] as RequestHandler[],
      Middleware.secure(this.controller.getOne)
    )


    this.evaluations.patch(
      '/:id',
      [
        Middleware.authenticate,
        pipe.getOne,
        Middleware.usePipe,
      ] as RequestHandler[],
      Middleware.secure(this.controller.patchOne)
    )

    return this.consumer
  }
}

export default new EvaluationsRouter().httpConsumer()
