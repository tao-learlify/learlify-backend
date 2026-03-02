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
  constructor() {
    this.controller = new LatestEvaluationsController()
    this.logger = Logger.Service
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /latest')
    }

    this.latest.get(
      '/all',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    this.latest.get(
      '/count',
      [Middleware.authenticate],
      Middleware.secure(this.controller.getCount)
    )

    this.latest.get(
      '/:id',
      [
        Middleware.authenticate,
        pipe.getOne,
        Middleware.usePipe,
        Middleware.isResourceOwner({ context: OWNER.LATEST })
      ],
      Middleware.secure(this.controller.getOne)
    )

    return this.consumer
  }
}

export default new LatestEvaluationsRouter().httpConsumer()
