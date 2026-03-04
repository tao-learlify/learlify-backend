import { Router, type Router as ExpressRouter } from 'express'
import type { HttpConsumer } from '@types'
import { Logger } from 'api/logger'

type ApplicationInterfaceConfig = {
  controllers?: HttpConsumer[]
}

export class ApplicationInterfaceService {
  private logger: typeof Logger.Service
  private controllers: HttpConsumer[]

  constructor({ controllers }: ApplicationInterfaceConfig) {
    this.controllers = controllers || []
    this.logger = Logger.Service
  }

  public applyRouterManagement(): ExpressRouter {
    const router = Router()

    this.logger.info('Settings for controllers')

    this.controllers.forEach(({ route, handlers }) => {
      router.use(route, handlers)
    })

    return router
  }
}
