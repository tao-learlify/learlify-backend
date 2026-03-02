import { Logger } from 'api/logger'
import { Router } from 'decorators'
import { ClassesController } from './classes.controller'
import { Middleware } from 'middlewares'
import { pipe } from './classes.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

/**
 * @description
 * Inheris methods like this.consumer
 */
@Router({
  alias: 'classes',
  route: '/classes'
})
class Classes {
  constructor() {
    this.controller = new ClassesController()
    this.logger = Logger.Service
  }

  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /classes')
    }

    /**
     * @description
     * Joins the meeting in a schedule.
     * @method POST
     */
    this.classes.post(
      '/',
      [
        Middleware.authenticate,
        Middleware.noDemoReferrer,
        pipe.create,
        Middleware.usePipe,
        Middleware.timezone
      ],
      Middleware.secure(this.controller.create)
    )

    /**
     * Obtains class from roomName.
     * @method GET
     */
    this.classes.get(
      '/',
      [
        Middleware.authenticate,
        pipe.getOne,
        Middleware.usePipe,
        Middleware.timezone
      ],
      Middleware.secure(this.controller.getOne)
    )

    this.classes.get(
      '/confirmed',
      [Middleware.authenticate, Middleware.timezone],
      Middleware.secure(this.controller.getAll)
    )

    this.classes.get(
      '/history',
      [Middleware.authenticate, Middleware.timezone],
      Middleware.secure(this.controller.getAll)
    )

    return this.consumer
  }
}

export default new Classes().httpConsumer()
