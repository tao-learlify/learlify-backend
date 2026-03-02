import { Router } from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { AWSController } from './aws.controller'
import { AmazonWebServices } from './aws.service'
import { pipe } from './aws.pipe'
import { MODE } from 'common/process'
import { isRunningOnProductionOrDevelopment } from 'functions'

class AWSRouter {
  constructor() {
    this.aws = Router()
    this.options = {
      bucket:
        process.env.NODE_ENV === MODE.development
          ? 'aptispruebas'
          : 'aptisgo/speakings'
    }
    this.controller = new AWSController({ bucket: this.options.bucket })
    this.fileInterceptor = new AmazonWebServices().fileInterceptor
    this.logger = Logger.Service
    this.httpConsumer = this.httpConsumer.bind(this)
  }

  httpConsumer() {
    const { bucket } = this.options

    if (isRunningOnProductionOrDevelopment()) {
      this.logger.info('http: /aws')
    }

    this.aws.get(
      '/',
      [Middleware.authenticate, pipe.getFile, Middleware.usePipe],
      Middleware.secure(this.controller.getFile)
    )

    this.aws.post(
      '/upload',
      [
        Middleware.authenticate,
        pipe.upload,
        Middleware.usePipe,
        this.fileInterceptor({ bucket })
      ],
      Middleware.secure(this.controller.uploadSpeaking)
    )

    return {
      route: '/aws',
      handlers: this.aws
    }
  }
}

export default new AWSRouter().httpConsumer()
