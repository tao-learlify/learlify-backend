import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { LanguageController } from './language.controller'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'languages',
  route: '/languages'
})
class LanguagesRouter {
  constructor() {
    this.controller = new LanguageController()
    this.logger = Logger.Service
  }
  
  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /languages')
    }

    this.languages.get(
      '/',
      [Middleware.authenticate],
      Middleware.secure(this.controller.getAll)
    )

    return this.consumer
  }
}

export default new LanguagesRouter().httpConsumer()
