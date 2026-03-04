import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { MeetingsController } from './meeetings.controller'
import { pipe } from './meetings.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'
import type { Router as ExpressRouter, RequestHandler } from 'express'
import type { HttpConsumer } from '@types'

@Router({
  alias: 'meetings',
  route: '/meetings'
})
class MeetingsRouter {
  declare meetings: ExpressRouter
  declare consumer: HttpConsumer

  private controller: MeetingsController
  private logger: typeof Logger.Service

  constructor() {
    this.controller = new MeetingsController()
    this.logger = Logger.Service
  }

  httpConsumer(): HttpConsumer {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /meetings')
    }

    this.meetings.get(
      '/',
      [Middleware.authenticate, ...pipe.token, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.token) as RequestHandler
    )

    this.logger.debug('Testing Enviroment with Twilio Test', { active: true })

    this.meetings.get(
      '/token',
      [Middleware.authenticate] as RequestHandler[],
      Middleware.secure(this.controller.twilioTest) as RequestHandler
    )

    this.meetings.get(
      '/identity',
      [Middleware.authenticate, Middleware.isAuthorizedReferrer, ...pipe.identity, Middleware.usePipe] as RequestHandler[],
      Middleware.secure(this.controller.identity) as RequestHandler
    )

    return this.consumer
  }
}

export default new MeetingsRouter().httpConsumer()
