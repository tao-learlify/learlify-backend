import { text, json, urlencoded } from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import passport from 'passport'
import i18n from 'i18n'



import root from 'config/root'
import { validationErrorHandler } from './handlers'


/**
 * @description
 * RootMiddleware.
 */
const rootMiddleware = [
  helmet(),
  cors('*'),
  compression(),
  morgan('short', root.logger),
  i18n.init,
  text(),
  json(root.json),
  urlencoded(root.urlencoded),
  passport.initialize(),
  validationErrorHandler,
]


export default rootMiddleware