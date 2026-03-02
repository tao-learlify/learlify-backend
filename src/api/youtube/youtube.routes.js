import { Router } from 'decorators'
import { Middleware } from 'middlewares'
import { pipe } from './youtube.pipe'

import { YoutubeController } from './youtube.controller'

@Router({
  alias: 'provider',
  route: '/youtube'
})
class YoutubeRouter {
  constructor() {
    this.controller = new YoutubeController()
  }

  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    this.provider.get(
      '/',
      [Middleware.authenticate, pipe.getAll, Middleware.usePipe],
      Middleware.secure(this.controller.getAll)
    )

    return this.consumer
  }
}

export default new YoutubeRouter().httpConsumer()
