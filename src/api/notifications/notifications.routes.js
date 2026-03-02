import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { NotificationsController } from './notifications.controller'
import { pipe } from './notifications.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import { Roles } from 'metadata/roles'
import { OWNER } from 'metadata/owners'

@Router({
  alias: 'notifications',
  route: '/notifications'
})
class NotificationsRouter {
  constructor() {
    this.controller = new NotificationsController()
    this.logger = Logger.Service
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /notifications')
    }

    this.notifications.post(
      '/',
      [
        Middleware.authenticate,
        Middleware.RolesGuard([Roles.Admin]),
        pipe.create,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.create)
    )

    this.notifications.get(
      '/all',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    this.notifications.get(
      '/:id',
      [
        Middleware.authenticate,
        Middleware.isResourceOwner({ context: OWNER.NOTIFICATION }),
        pipe.getOne,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.getOne)
    )

    this.notifications.put(
      '/:id',
      [
        Middleware.authenticate,
        Middleware.isResourceOwner({ context: OWNER.NOTIFICATION }),
        pipe.updateOne,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.updateOne)
    )

    this.notifications.put(
      '/all',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.markAllAsRead)
    )

    this.notifications.delete(
      '/',
      Middleware.secure(this.controller.deleteExpired)
    )

    return this.consumer
  }
}

export default new NotificationsRouter().httpConsumer()
