import { Router } from 'decorators'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { MeetingsController } from './meeetings.controller'
import { pipe } from './meetings.pipe'
import { isRunningOnProductionOrDevelopment } from 'functions'

@Router({
  alias: 'meetings',
  route: '/meetings'
})
class MeetingsRouter {
  constructor() {
    this.controller = new MeetingsController()
    this.logger = Logger.Service
  }

  /**
   * @returns {HttpConsumer}
   */
  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /meetings')
    }

    this.meetings.get(
      '/',
      [Middleware.authenticate, pipe.token, Middleware.usePipe],
      Middleware.secure(this.controller.token)
    )

    this.logger.debug('Testing Enviroment with Twilio Test', { active: true })

    this.meetings.get(
      '/token',
      [Middleware.authenticate],
      Middleware.secure(this.controller.twilioTest)
    )

    this.meetings.get(
      '/identity',
      [Middleware.authenticate, Middleware.isAuthorizedReferrer, pipe.identity, Middleware.usePipe],
      Middleware.secure(this.controller.identity)
    )

    return this.consumer
  }
}

export default new MeetingsRouter().httpConsumer()
