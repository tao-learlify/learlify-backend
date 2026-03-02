import { Logger } from 'api/logger'
import { PlansController } from './plans.controller'
import { Middleware } from 'middlewares'
import { Router } from 'decorators'
import { pipe } from './plans.pipe'
import { Roles } from 'metadata/roles'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'plans',
  route: '/plans'
})
class Plans {
  constructor() {
    this.controller = new PlansController()
    this.logger = Logger.Service
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /plans')
    }

    this.plans.get(
      '/',
      [Middleware.authenticate],
      pipe.getAll,
      Middleware.usePipe,
      Middleware.GeoLocationGuard,
      Middleware.secure(this.controller.getAll)
    )

    this.plans.put(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.update,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.updateOne)
    )

    this.plans.get(
      '/:id',
      [Middleware.authenticate, pipe.findOne, Middleware.usePipe],
      Middleware.secure(this.controller.findOne)
    )

    this.plans.post(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.create,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.create)
    )

    this.plans.delete(
      '/:id',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.remove,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.remove)
    )

    return this.consumer
  }
}

export default new Plans().httpConsumer()
