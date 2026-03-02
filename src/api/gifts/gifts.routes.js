import { Logger } from 'api/logger'
import { Router } from 'decorators'
import { isRunningOnProductionOrDevelopment } from 'functions'
import { Middleware } from 'middlewares'
import { GiftsController } from './gifts.controller'
import { pipe } from './gifts.pipe'

@Router({
  alias: 'gifts',
  route: '/gifts'
})
class GiftsRouter {
  constructor() {
    this.controller = new GiftsController()
    this.logger = Logger.Service
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /gifts')
    }

    /**
     * @description
     * Create a new gift
     * @method POST
     */
    this.gifts.post(
      '/',
      [Middleware.authenticate, pipe.create, Middleware.usePipe],
      Middleware.secure(this.controller.create)
    )

    /**
     * @description
     * Exchange a gift
     * @method PUT
     */
    this.gifts.put(
      '/',
      [Middleware.authenticate, pipe.exchange, Middleware.usePipe],
      Middleware.secure(this.controller.exchangeGift)
    )

    return this.consumer
  }
}

export default new GiftsRouter().httpConsumer()
