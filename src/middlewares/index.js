import passport from 'passport'
import Multer from 'multer'
import { NotFoundException, UnauthorizedException } from 'exceptions'
import geoip from 'geoip-lite'
import currencyJSON from 'core/currency.json'
import { validationResult } from 'express-validator'
import { Logger } from 'api/logger'

import { generateDateFileName, sanitizeFile } from 'functions'

import { MODE } from 'common/process'
import { getTeacherEvaluation } from 'api/evaluations/evaluations.services'
import config from '../config'
import demo from 'metadata/demo'
import Plan from 'api/plans/plans.model'
import { OWNER } from 'metadata/owners'
import LatestEvaluation from 'api/latest-evaluations/latestEvaluations.model'
import Notification from 'api/notifications/notifications.model'

const OWNER_REF = ['id', 'userId']

const logger = Logger.Service

/**
 * @see https://github.com/expressjs/multer
 */
const STORAGE = Multer.memoryStorage({
  destination: (req, file, callback) => {
    logger.info('file', file)

    callback(null, 'src')
  },
  filename: (req, file, callback) => {
    callback(null, generateDateFileName(file.originalname))
  }
})

export class Middleware {
  /**
   * @param {string []} roles
   * @returns {Promise<() => (req: import('express').Request, res: import('express').Response, next: Function)>}
   */
  static RolesGuard(roles) {
    return Middleware.secure(async (req, res, next) => {
      const role = req.user.role

      try {
        if (roles.includes(role.name)) {
          return next()
        } else {
          throw new UnauthorizedException()
        }
      } catch (err) {
        return res.status(401).json({
          message: err.message,
          statusCode: 401
        })
      }
    })
  }

  static isEvaluationOwner() {
    return Middleware.secure(async (req, res, next) => {
      const user = req.user

      const evaluation = await getTeacherEvaluation(req.params.id, [
        'teacherId'
      ])

      if (evaluation.length === 0) {
        return res.status(404).json({
          message: 'Evaluation was not found.',
          statusCode: 404
        })
      }

      if (evaluation[0].teacherId !== user.id) {
        return res.status(403).json({
          message:
            'The server understood the request but refuses to authorize it.',
          statusCode: 403
        })
      }

      return next()
    })
  }

  /**
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @param {import("express").NextFunction} next
   */
  static usePipe(req, res, next) {
    const errorHandler = validationResult(req)

    logger.debug('middleware.usePipe context', errorHandler)

    if (errorHandler.isEmpty()) {
      return next()
    }

    return res.status(400).json({
      details: errorHandler.array(),
      message: 'Bad Request',
      statusCode: 400
    })
  }

  /**
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @param {import("express").NextFunction} next
   */
  static LanguageGuard(req, res, next) {
    const logger = Logger.Service

    logger.debug('Middleware.LanguageGuard', { lang: req.language })

    res.setLocale(req.language)

    return next()
  }

  /**
   * @param {Function} handler
   * @returns {(req: Request, res: Response, next: NextFunction) => void}
   */
  static secure(handler) {
    return function (req, res, next) {
      handler(req, res, next).catch(err => {
        const logger = Logger.Service

        logger.error(err.message)
        logger.error(err.stack)

        return res.status(err.statusCode || 500).json({
          message: err.message,
          statusCode: err.statusCode || 500,
          stack:
            process.env.NODE_ENV === MODE.development ? err.stack : undefined
        })
      })
    }
  }

  /**
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @param {import("express").NextFunction} next
   */
  static authenticate(req, res, next) {
    passport.authenticate('jwt', { session: false }, (_err, user) => {
      if (user) {
        req.user = user

        return next()
      }

      return res.status(401).json({
        details: res.__('errors.Invalid Token'),
        message: res.__('errors.Unauthorized Request'),
        statusCode: 401
      })
    })(req, res, next)
  }

  /**
   * 1
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {import ('express').Function} next
   */
  static timezone(req, res, next) {
    const logger = Logger.Service

    const header = 'the-timezone-iana'

    if (req.headers[header]) {
      req.timezone = req.headers[header]

      logger.debug('The-Timezone-IANA Request: ', {
        location: req.headers[header]
      })

      return next()
    }

    req.timezone = config.TZ

    next()
  }

  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {import ('express').NextFunction} next
   */
  static isAuthorizedReferrer(req, res, next) {
    const origin = req.headers.origin

    if (config.AUTHORIZED_ORIGINS.includes(origin)) {
      return next()
    }

    return res.status(401).json({
      message: res.__('errors.Unauthorized')
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {import ('express').NextFunction} next
   */
  static noDemoReferrer(req, res, next) {
    const user = req.user

    if (demo.isDemoUser(user.email)) {
      logger.warn('Middleware DemoReferrer Intercepted, this is not a error.')

      /**
       * @type {Proxy Authentication}
       */
      return res.status(407).json({
        message:
          'User needs to be authenticated with a valid credentials for making this action',
        statusCode: 407
      })
    }

    return next()
  }

  static memoryStorage(req, res, next) {
    const disk = Multer({
      storage: STORAGE,
      fileFilter: (req, file, callback) => {
        sanitizeFile(file, callback)
      }
    })

    const upload = disk.array(
      config.MULTIPART_FORMDATA.DISK,
      config.MULTIPART_FORMDATA.ITEMS
    )

    upload(req, res, err => {
      if (err || err instanceof Multer.MulterError) {
        return res.status(400).json({
          details: err
        })
      } else {
        req.files.forEach(file => {
          file.originalname = generateDateFileName(file.originalname)
        })

        return next()
      }
    })
  }

  /**
   * @param {string []} plans
   */
  static requiresMembership(plans) {
    return async (req, res, next) => {
      const ref = {
        data: null
      }

      try {
        ref.data = await Plan.query().whereIn('name', [plans])
      } catch (err) {
        return res.status(402).json({
          message: 'Requires Payment',
          statusCode: 402
        })
      }

      req.plans = ref.data

      return next()
    }
  }

  /**
   * @typedef {Object} Resource
   * @property {string} context
   *
   * @param {Resource}
   */

  static isResourceOwner({ context }) {
    return Middleware.secure(async (req, res, next) => {
      const { id } = req.params

      if (context === OWNER.LATEST) {
        const { userId } = await LatestEvaluation.query()
          .findById(id)
          .select(OWNER_REF)

        if (userId) {
          if (userId === req.user.id) {
            return next()
          }
  
          logger.warn('Invalid owner', req.user.id)
  
          throw new UnauthorizedException()
        }

        throw new NotFoundException()
      }

      if (context === OWNER.NOTIFICATION) {
        const { userId } = await Notification.query()
          .findById(id)
          .select(['id', 'userId'])

        if (userId) {
          if (userId === req.user.id) {
            return next()
          }
  
          logger.warn('Invalid owner', req.user.id)
  
          throw new UnauthorizedException()
        }

        throw new NotFoundException()
      }
    })
  }
  
  static GeoLocationGuard(req, res, next) {
    const logger = Logger.Service

    const ip = req.ip

    logger.info('ip', { ip })

    const lookup = geoip.lookup(ip)

    if (!lookup) {
      logger.warn('Lookup Not Found')

      req.country = 'ES'

      req.currency = 'EUR'

      return next()
    }

    const currency = currencyJSON[lookup.country]

    if (!currency) {
      logger.warn('Currenct Not Found')

      req.country = lookup.country

      req.currency = 'EUR'
    
      return next()
    }

    logger.info('Enabling Currency', {
      country: lookup.country,
      currency: currency
    })

    req.country = lookup.country

    req.currency = currency
    
    next()
  }
}
