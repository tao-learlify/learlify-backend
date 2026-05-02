import { Router } from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { AdvanceController } from './advance.controller'
import { pipe } from './advance.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'

class AdvanceRouter {
  private advance: ExpressRouter
  private logger: typeof Logger.Service
  private controller: AdvanceController

  constructor() {
    this.advance = Router()
    this.logger = Logger.Service
    this.controller = new AdvanceController()
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /advance')
    }

    this.advance.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.getAll) as RequestHandler
    )

    this.advance.post(
      '/',
      [Middleware.authenticate, pipe.create, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.create) as RequestHandler
    )

    this.advance.put(
      '/',
      [Middleware.authenticate, pipe.update, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.updateOne) as RequestHandler
    )

    return {
      route: '/advance',
      handlers: this.advance
    }
  }
}

export default new AdvanceRouter().httpConsumer()
