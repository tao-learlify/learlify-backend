import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { LatestEvaluationsController } from './latestEvaluations.controller'
import { pipe } from './latestEvaluations.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import { OWNER } from 'metadata/owners'

@Router({
  alias: 'latest',
  route: '/latest'
})
class LatestEvaluationsRouter {
  declare latest: ExpressRouter
  declare consumer: HttpConsumer
  private controller: LatestEvaluationsController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new LatestEvaluationsController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /latest')
    }

    this.latest.get(
      '/all',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.getAll) as RequestHandler
    )

    this.latest.get(
      '/count',
      [Middleware.authenticate] as RequestHandler[],
      Middleware.secure(this.controller.getCount) as RequestHandler
    )

    this.latest.get(
      '/:id',
      [
        Middleware.authenticate,
        pipe.getOne,
        Middleware.usePipe,
        Middleware.isResourceOwner({ context: OWNER.LATEST })
      ] as RequestHandler[],
      Middleware.secure(this.controller.getOne) as RequestHandler
    )

    return this.consumer
  }
}

export default new LatestEvaluationsRouter().httpConsumer()
