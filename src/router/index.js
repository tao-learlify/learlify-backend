import { Router } from 'express'
import { Logger } from 'api/logger'

export class ApplicationInterfaceService {
  /**
   *
   * @param {{ controllers: [] }} config
   */
  constructor({ controllers }) {
    this.controllers = controllers || []
    this.logger = Logger.Service
  }

  applyRouterManagement() {
    const router = Router()

    this.logger.info('Settings for controllers')

    this.controllers.forEach(({ route, handlers }) => {
      router.use(route, handlers)
    }) 

    return router
  }
}
