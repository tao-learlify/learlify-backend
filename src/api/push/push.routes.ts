import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { PushController } from './push.controller'
import { pipe } from './push.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'push',
  route: '/push'
})
class PushRouter {
  declare push: ExpressRouter
  declare consumer: HttpConsumer
  private controller: PushController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new PushController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /push')
    }

    // Public — frontend needs the key before the user logs in
    this.push.get(
      '/vapid-public-key',
      Middleware.secure(this.controller.getVapidPublicKey)
    )

    this.push.post(
      '/subscribe',
      [Middleware.authenticate, pipe.subscribe, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.subscribe)
    )

    this.push.delete(
      '/subscribe',
      [Middleware.authenticate, pipe.unsubscribe, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.unsubscribe)
    )

    return this.consumer
  }
}

export default new PushRouter().httpConsumer()
