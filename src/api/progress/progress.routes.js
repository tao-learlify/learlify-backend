import { Bind, Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { ProgressController } from './progress.controller'
import { pipe } from './progress.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import { updateProgressValidationJSON } from './progress.validation'

@Router({
  alias: 'progress',
  route: '/progress'
})
class ProgressRouter {
  constructor() {
    this.controller = new ProgressController()
    this.logger = Logger.Service
  }

  @Bind
  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /progress')
    }

    this.progress.get(
      '/',
      [
        Middleware.authenticate,
        pipe.getOne,
        Middleware.usePipe,
        Middleware.noDemoReferrer
      ],
      Middleware.secure(this.controller.getOne)
    )

    this.progress.post(
      '/',
      [Middleware.authenticate, pipe.create, Middleware.usePipe],
      Middleware.secure(this.controller.create)
    )

    this.progress.put(
      '/',
      [
        Middleware.authenticate,
        Middleware.noDemoReferrer,
        Middleware.memoryStorage,
        updateProgressValidationJSON
      ],
      Middleware.secure(this.controller.updateOne)
    )

    this.progress.patch(
      '/',
      [
        Middleware.authenticate,
        pipe.patchOne,
        Middleware.usePipe,
        Middleware.noDemoReferrer
      ],
      Middleware.secure(this.controller.patchOne)
    )

    return this.consumer
  }
}

const { httpConsumer } = new ProgressRouter()

const consumer = httpConsumer()

export default consumer
