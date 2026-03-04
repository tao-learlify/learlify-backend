import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { FeedbackController } from './feedback.controller'
import { pipe } from './feedback.pipe'
import { Middleware } from 'middlewares'

@Router({
  alias: 'feedback',
  route: '/feedback'
})
class FeedbackRouter {
  declare feedback: ExpressRouter
  declare consumer: HttpConsumer
  private controller: FeedbackController

  constructor() {
    this.controller = new FeedbackController()
  }

  httpConsumer(): HttpConsumer {
    this.feedback.get(
      '/',
      [Middleware.authenticate, pipe.getOne, Middleware.usePipe, Middleware.LanguageGuard] as RequestHandler[],
      Middleware.secure(this.controller.getOne) as RequestHandler
    )

    return this.consumer
  }
}

export default new FeedbackRouter().httpConsumer()
