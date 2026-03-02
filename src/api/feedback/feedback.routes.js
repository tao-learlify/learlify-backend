import { Router } from 'decorators'
import { FeedbackController } from './feedback.controller'
import { pipe } from './feedback.pipe'
import { Middleware } from 'middlewares'

@Router({
  alias: 'feedback',
  route: '/feedback'
})
class FeedbackRouter {
  constructor() {
    this.controller = new FeedbackController()
  }

  httpConsumer() {
    this.feedback.get(
      '/',
      [Middleware.authenticate, pipe.getOne, Middleware.usePipe, Middleware.LanguageGuard],
      Middleware.secure(this.controller.getOne)
    )


    return this.consumer
  }
}

export default new FeedbackRouter().httpConsumer()
