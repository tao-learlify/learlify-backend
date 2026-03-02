import { text, json, urlencoded } from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import passport from 'passport'
import i18n from 'i18n'

import root from 'config/root'
import config from 'config'
import { validationErrorHandler } from './handlers'
import { globalLimiter } from './rateLimit'
import requestId from './requestId'
import { metricsCollector } from './metricsCollector'

const corsOptions = {
  origin: config.AUTHORIZED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}

/**
 * @description
 * RootMiddleware.
 */
const rootMiddleware = [
  requestId,
  metricsCollector,
  helmet(),
  cors(corsOptions),
  globalLimiter,
  compression(),
  morgan('short', root.logger),
  i18n.init,
  text(),
  json(root.json),
  urlencoded(root.urlencoded),
  passport.initialize(),
  validationErrorHandler
]

export default rootMiddleware
