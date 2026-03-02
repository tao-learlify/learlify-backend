import { Router } from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { authLimiter } from 'middlewares/rateLimit'
import { pipe } from './authentication.pipe'
import { AuthenticationController } from './authentication.controller'
import { isRunningOnProductionOrDevelopment } from 'functions'

export class AuthenticationRouter {
  constructor() {
    this.auth = Router()
    this.logger = Logger.Service
    this.controller = new AuthenticationController()
  }

  httpConsumer() {
    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /auth')
    }

    this.auth.post(
      '/register',
      [authLimiter, pipe.signUp, Middleware.usePipe, Middleware.LanguageGuard],
      Middleware.secure(this.controller.signUp)
    )

    this.auth.post(
      '/login',
      [authLimiter, pipe.signIn, Middleware.usePipe],
      Middleware.secure(this.controller.signIn)
    )

    this.auth.post(
      '/social/google',
      [pipe.googleLogin, Middleware.usePipe, Middleware.LanguageGuard],
      Middleware.secure(this.controller.googleLogin)
    )

    this.auth.post(
      '/social/facebook',
      [pipe.facebookLogin, Middleware.usePipe, Middleware.LanguageGuard],
      Middleware.secure(this.controller.facebookLogin)
    )

    this.auth.put(
      '/verify',
      [pipe.verifiy, Middleware.usePipe],
      Middleware.secure(this.controller.verification)
    )

    this.auth.post(
      '/forgot',
      [authLimiter, pipe.forgot, Middleware.usePipe, Middleware.LanguageGuard],
      Middleware.secure(this.controller.forgot)
    )

    this.auth.post(
      '/refresh-token',
      [
        Middleware.authenticate,
        Middleware.noDemoReferrer,
        pipe.refresh,
        Middleware.usePipe
      ],
      Middleware.secure(this.controller.refreshToken)
    )

    this.auth.put(
      '/reset',
      [pipe.reset, Middleware.usePipe],
      Middleware.secure(this.controller.resetPassword)
    )

    this.auth.get('/demo', Middleware.secure(this.controller.demoUser))

    return {
      route: '/auth',
      handlers: this.auth
    }
  }
}

export default new AuthenticationRouter().httpConsumer()
