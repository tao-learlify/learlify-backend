import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { FileFilterCallback, StorageEngine } from 'multer'
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

type ErrorLike = {
  message?: unknown
  stack?: unknown
  statusCode?: unknown
}

type AppConfig = {
  TZ: string
  AUTHORIZED_ORIGINS: string[]
  MULTIPART_FORMDATA: {
    FILESIZE: number
    DISK: string
    ITEMS: number
  }
}

type RoleLike = {
  name: string
}

type RequestUserLike = {
  id: number
  email: string
  role: RoleLike
}

type MiddlewareRequest = Request & {
  user?: Express.User
  language?: string
  timezone?: string
  country?: string
  currency?: string
  plans?: unknown
  files?: Express.Multer.File[]
}

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>

type MulterLike = typeof Multer & {
  memoryStorage(options: {
    destination: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, destination: string) => void
    ) => void
    filename: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void
    ) => void
  }): StorageEngine
}

const OWNER_REF = ['id', 'userId']

const logger = Logger.Service

const runtimeConfig = config as unknown as AppConfig
const currencyMap = currencyJSON as Record<string, string | undefined>
const multerRuntime = Multer as unknown as MulterLike

const STORAGE = multerRuntime.memoryStorage({
  destination: (req, file, callback) => {
    void req

    logger.info('file', file)

    callback(null, 'src')
  },
  filename: (req, file, callback) => {
    void req

    callback(null, generateDateFileName(file.originalname))
  }
})

export class Middleware {
  static RolesGuard(roles: string[]): RequestHandler {
    return Middleware.secure(async (req, res, next): Promise<unknown> => {
      const role = (req as MiddlewareRequest).user?.role as unknown as RoleLike

      try {
        if (roles.includes(role.name)) {
          return next()
        } else {
          throw new UnauthorizedException()
        }
      } catch (err: unknown) {
        const current = err as ErrorLike
        return res.status(401).json({
          message: current.message,
          statusCode: 401
        })
      }
    })
  }

  static isEvaluationOwner(): RequestHandler {
    return Middleware.secure(async (req, res, next): Promise<unknown> => {
      const user = (req as MiddlewareRequest).user as unknown as RequestUserLike

      const evaluation = (await getTeacherEvaluation(req.params.id, [
        'teacherId'
      ])) as unknown as Array<{ teacherId: number }>

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

  static usePipe(req: Request, res: Response, next: NextFunction): unknown {
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

  static LanguageGuard(
    req: Request,
    res: Response,
    next: NextFunction
  ): unknown {
    const runtimeLogger = Logger.Service
    const request = req as MiddlewareRequest

    runtimeLogger.debug('Middleware.LanguageGuard', { lang: request.language })

    res.setLocale(request.language as string)

    return next()
  }

  static secure(handler: AsyncHandler): RequestHandler {
    return function (req: Request, res: Response, next: NextFunction): void {
      handler(req, res, next).catch((err: unknown) => {
        const runtimeLogger = Logger.Service
        const current = err as ErrorLike
        const statusCode =
          typeof current.statusCode === 'number' ? current.statusCode : 500

        runtimeLogger.error(current.message)
        runtimeLogger.error(current.stack)

        res.status(statusCode).json({
          message: current.message,
          statusCode: statusCode,
          stack:
            process.env.NODE_ENV === MODE.development ? current.stack : undefined
        })
      })
    }
  }

  static authenticate(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate(
      'jwt',
      { session: false },
      (_err: unknown, user: unknown) => {
      void _err

      if (user) {
        const request = req as MiddlewareRequest
        request.user = user as Express.User

        return next()
      }

      return res.status(401).json({
        details: res.__('errors.Invalid Token'),
        message: res.__('errors.Unauthorized Request'),
        statusCode: 401
      })
      }
    )(req, res, next)
  }

  static timezone(req: Request, _res: Response, next: NextFunction): void {
    void _res

    const runtimeLogger = Logger.Service
    const request = req as MiddlewareRequest
    const header = 'the-timezone-iana'
    const timezoneHeader = request.headers[header]

    if (timezoneHeader) {
      request.timezone = timezoneHeader as string

      runtimeLogger.debug('The-Timezone-IANA Request: ', {
        location: timezoneHeader
      })

      return next()
    }

    request.timezone = runtimeConfig.TZ

    next()
  }

  static isAuthorizedReferrer(
    req: Request,
    res: Response,
    next: NextFunction
  ): unknown {
    const origin = req.headers.origin

    if (runtimeConfig.AUTHORIZED_ORIGINS.includes(origin as string)) {
      return next()
    }

    return res.status(401).json({
      message: res.__('errors.Unauthorized')
    })
  }

  static noDemoReferrer(
    req: Request,
    res: Response,
    next: NextFunction
  ): unknown {
    const user = (req as MiddlewareRequest).user as unknown as RequestUserLike

    if (demo.isDemoUser(user.email)) {
      logger.warn('Middleware DemoReferrer Intercepted, this is not a error.')

      return res.status(407).json({
        message:
          'User needs to be authenticated with a valid credentials for making this action',
        statusCode: 407
      })
    }

    return next()
  }

  static memoryStorage(req: Request, res: Response, next: NextFunction): void {
    const disk = Multer({
      limits: { fileSize: runtimeConfig.MULTIPART_FORMDATA.FILESIZE },
      storage: STORAGE,
      fileFilter: (request, file, callback) => {
        void request
        sanitizeFile(
          file as unknown as Record<string, unknown>,
          callback as unknown as FileFilterCallback
        )
      }
    })

    const upload = disk.array(
      runtimeConfig.MULTIPART_FORMDATA.DISK,
      runtimeConfig.MULTIPART_FORMDATA.ITEMS
    )

    upload(req, res, (err: unknown) => {
      if (err || err instanceof Multer.MulterError) {
        return res.status(400).json({
          details: err
        })
      } else {
        const request = req as MiddlewareRequest
        const files = request.files || []

        files.forEach(file => {
          file.originalname = generateDateFileName(file.originalname)
        })

        return next()
      }
    })
  }

  static requiresMembership(plans: string[]): RequestHandler {
    return async (req, res, next): Promise<unknown> => {
      const ref: { data: unknown } = {
        data: null
      }

      try {
        ref.data = await Plan.query().whereIn('name', [plans])
      } catch (err: unknown) {
        void err
        return res.status(402).json({
          message: 'Requires Payment',
          statusCode: 402
        })
      }

      const request = req as MiddlewareRequest
      request.plans = ref.data

      return next()
    }
  }

  static isResourceOwner(options: { context: string }): RequestHandler {
    const { context } = options

    return Middleware.secure(async (req, _res, next): Promise<unknown> => {
      void _res
      const { id } = req.params

      if (context === OWNER.LATEST) {
        const { userId } = (await LatestEvaluation.query()
          .findById(id)
          .select(OWNER_REF as unknown as string[])) as unknown as {
          userId?: number
        }

        if (userId) {
          if (userId === (req as MiddlewareRequest).user?.id) {
            return next()
          }

          logger.warn('Invalid owner', (req as MiddlewareRequest).user?.id)

          throw new UnauthorizedException()
        }

        throw new NotFoundException()
      }

      if (context === OWNER.NOTIFICATION) {
        const { userId } = (await Notification.query()
          .findById(id)
          .select(['id', 'userId'])) as unknown as { userId?: number }

        if (userId) {
          if (userId === (req as MiddlewareRequest).user?.id) {
            return next()
          }

          logger.warn('Invalid owner', (req as MiddlewareRequest).user?.id)

          throw new UnauthorizedException()
        }

        throw new NotFoundException()
      }
    })
  }

  static GeoLocationGuard(
    req: Request,
    _res: Response,
    next: NextFunction
  ): unknown {
    void _res
    const runtimeLogger = Logger.Service
    const request = req as MiddlewareRequest
    const ip = request.ip as string

    runtimeLogger.info('ip', { ip })

    const lookup = geoip.lookup(ip)

    if (!lookup) {
      runtimeLogger.warn('Lookup Not Found')

      request.country = 'ES'

      request.currency = 'EUR'

      return next()
    }

    const currency = currencyMap[lookup.country]

    if (!currency) {
      runtimeLogger.warn('Currenct Not Found')

      request.country = lookup.country

      request.currency = 'EUR'

      return next()
    }

    runtimeLogger.info('Enabling Currency', {
      country: lookup.country,
      currency: currency
    })

    request.country = lookup.country

    request.currency = currency

    next()
  }
}
