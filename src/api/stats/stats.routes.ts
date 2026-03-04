import { Router } from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { StatsController } from './stats.controller'
import { pipe } from './stats.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'

class StatsRouter {
  private stats: ExpressRouter
  private logger: typeof Logger.Service
  private controller: StatsController

  constructor() {
    this.stats = Router()
    this.logger = Logger.Service
    this.controller = new StatsController()
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /stats')
    }

    this.stats.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.getAll) as RequestHandler
    )

    return {
      route: '/stats',
      handlers: this.stats
    }
  }
}

export default new StatsRouter().httpConsumer()
