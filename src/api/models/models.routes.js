import { Bind, Router } from 'decorators'
import { Logger } from 'api/logger'
import { ModelsController } from './models.controller'
import { isRunningOnProductionOrDevelopment } from 'functions'
import { Middleware } from 'middlewares'
import { pipe } from './models.pipe'

@Router({
  alias: 'models',
  route: '/models'
})
class Models {
  constructor() {
    this.controller = new ModelsController()
    this.logger = Logger.Service
  }

  @Bind
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /models')
    }

    this.models.get(
      '/',
      [Middleware.authenticate, pipe.getOne, Middleware.usePipe],
      Middleware.secure(this.controller.getAll),
      Middleware.secure(this.controller.getOne)
    )

    this.models.patch(
      '/',
      [
        Middleware.authenticate,
        pipe.patch,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.patch)
    )

    return this.consumer
  }
}

const { httpConsumer } = new Models()

const consumer = httpConsumer()

export default consumer