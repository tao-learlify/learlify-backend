import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { PackagesController } from './packages.controller'
import { Roles } from 'metadata/roles'
import { pipe } from './packages.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'packages',
  route: '/packages'
})
class PackageRouter {
  constructor() {
    this.controller = new PackagesController()
    this.logger = Logger.Service
    this.permissions = [Roles.Admin]
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /packages')
    }

    this.packages.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    this.packages.post(
      '/',
      [
        Middleware.authenticate,
        Middleware.noDemoReferrer,
        Middleware.LanguageGuard,
        pipe.create,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.create)
    )

    this.packages.post(
      '/assign',
      [
        Middleware.authenticate,
        Middleware.RolesGuard(this.permissions),
        Middleware.LanguageGuard,
        pipe.assign,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.assign)
    )

    this.packages.put(
      '/',
      [
        Middleware.authenticate,
        Middleware.noDemoReferrer,
        Middleware.LanguageGuard,
        pipe.update
      ],
      Middleware.secure(this.controller.update)
    )

    return this.consumer
  }
}

export default new PackageRouter().httpConsumer()
