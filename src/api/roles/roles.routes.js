import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { Router } from 'decorators'
import { Roles as Rol } from 'metadata/roles'
import { RolesController } from './roles.controller'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'roles',
  route: '/roles'
})
class Roles {
  constructor() {
    this.controller = new RolesController()
    this.logger = Logger.Service
  }

  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /roles')
    }

    this.roles.get(
      '/',
      [Middleware.authenticate, Middleware.RolesGuard([Rol.Admin])],
      this.controller.getAll
    )

    return this.consumer
  }
}

export default new Roles().httpConsumer()
