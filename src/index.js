import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import passport from 'passport'
import i18n from 'i18n'
import path from 'path'
import moment from 'moment'

import controllers from 'api/routes'
import config from './config'
import jwt from 'api/jwt/jwt.guard'
import { prodErrors, devErrors } from 'middlewares/handlers'
import logger from 'utils/logger'
import './config/db'
import stripeWebhook from 'api/stripe/stripe.webhook'
import healthRouter from 'api/health/health.routes'
import metricsRouter from 'api/metrics/metrics.routes'

import { Scheduler } from 'common/cron'
import { WebSockets } from 'gateways/socket'
import { closeRedisClient } from 'config/redis'

import { MODE } from 'common/process'
import { TASKS } from 'common/tasks'

/**
 * Tasks Module.
 */
import ScheduleTasks from 'tasks/schedule.tasks'
import PackagesTasks from 'tasks/packages.tasks'
import UsersTasks from 'tasks/users.tasks'
import NotificationsTasks from 'tasks/notifications.task'

/**
 * Sockets Module.
 */
import MeetingsGateway from 'gateways/modules/meetings'
import ChatGateway from 'gateways/modules/chat'

/**
 * @description
 * Main Middleware.
 */
import rootMiddleware from 'middlewares/rootMiddlware'
import root from 'config/root'

dotenv.config()

/**
 * @see https://expressjs.com/
 * @see https://socket.io/
 */
const app = express()

const server = http.createServer(app)

const stream = new Server()

/**
 * @description
 * Error tracking with stack for devError.
 */
const stackError =
  process.env.NODE_ENV === MODE.production ? prodErrors : devErrors

/**
 * @see https://www.npmjs.com/package/passport
 */
passport.use(jwt)

app.set('port', config.APP_PORT)
app.set('host', config.APP_HOST)

app.use(stripeWebhook)
app.use(healthRouter)
app.use(metricsRouter)

rootMiddleware.forEach(middleware => {
  if (process.env.NODE_ENV !== MODE.test) {
    logger.debug('Middleware: '.concat(middleware.name))
  }

  app.use(middleware)
})
/**
 * @description
 * Main endpoint.
 */
app.get(root.main, root.handler)
app.use(root.apiVersion, controllers)
app.use(stackError)

/**
 * @description
 * Loading i18next module.
 * @see https://en.wikipedia.org/wiki/Internationalization_and_localization
 */
i18n.configure({
  defaultLocale: root.locales[0],
  directory: path.join(__dirname, 'lang'),
  locales: root.locales,
  objectNotation: true
})
app.use(i18n.init)

/**
 * @description
 * Module for execute asynchronous tasks in realtime.
 */
const CronScheduler = new Scheduler({
  triggers: [
    [ScheduleTasks, TASKS.schedule],
    [PackagesTasks, TASKS.packages],
    [UsersTasks, TASKS.users],
    [NotificationsTasks, TASKS.notifications]
  ]
})

/**
 * @description
 * You can add functionality to the main socket.
 * A module is a piece of code can execute tasks in their own context.
 */
const Sockets = new WebSockets({
  stream,
  modules: [MeetingsGateway, ChatGateway]
})

stream.attach(server, {
  cookie: false,
  pingInterval: 10000,
  pingTimeout: 5000,
  allowEIO3: true,
  cors: {
    origin: config.AUTHORIZED_ORIGINS,
    credentials: true
  }
})

/**
 * @description
 * Listening on port and host.
 * This function executes CronScheduler, Sockets, and advice that on running mode.
 * Like development.
 */
server.listen(app.get('port'), app.get('host'), () => {
  CronScheduler.execute()

  Sockets.main()

  logger.info('Server has been started.', {
    date: moment(),
    port: app.get('port'),
    host: app.get('host')
  })

  if (process.env.NODE_ENV === MODE.production) {
    logger.info('Running as production mode.')
  } else if (process.env.NODE_ENV === MODE.development) {
    logger.info('Running as development mode.')
  } else {
    logger.info('Running as test mode.')
  }
})

process.on('unhandledRejection', reason => {
  logger.error('unhandledRejection', { reason })
  process.exit(1)
})

process.on('uncaughtException', err => {
  logger.error('uncaughtException', { message: err.message, stack: err.stack })
  process.exit(1)
})

process.on('SIGTERM', () => {
  server.close(async () => {
    await closeRedisClient()
    process.exit(0)
  })
})

export { app as server, Sockets, stream }
