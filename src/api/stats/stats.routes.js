import { Router } from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { StatsController } from './stats.controller'
import { pipe } from './stats.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

class StatsRouter {
  constructor() {
    this.stats = Router()
    this.logger = Logger.Service
    this.controller = new StatsController()
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /stats')
    }

    this.stats.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    return {
      route: '/stats',
      handlers: this.stats
    }
  }
}

export default new StatsRouter().httpConsumer()
