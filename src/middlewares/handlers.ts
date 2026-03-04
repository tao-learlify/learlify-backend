import type { NextFunction, Request, Response } from 'express'
import logger from '../utils/logger'

type JoiDetail = {
  message: string
  path: Array<string | number>
}

type ErrorLike = {
  isJoi?: boolean
  details?: JoiDetail[]
  status?: number
  statusCode?: number
  message?: unknown
  name?: unknown
  stack?: unknown
}

const isJoiValidationError = (
  err: unknown
): err is ErrorLike & { isJoi: true; details: JoiDetail[] } => {
  const current = err as ErrorLike
  return current.isJoi === true && Array.isArray(current.details)
}

export function validationErrorHandler(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  void _req
  void _res

  if (isJoiValidationError(err)) {
    logger.error(
      'An error related to a joi validation just ocurred',
      err.details
    )

    err.status = 400
    err.message = 'Your request did not pass the validation'
    err.details = err.details.map(detail => {
      return {
        message: detail.message,
        param: detail.path.join('.')
      }
    }) as unknown as JoiDetail[]
  }

  next(err as Error)
}

export const prodErrors = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  void _req
  void _next

  const current = err as ErrorLike
  const statusCode = typeof current.statusCode === 'number' ? current.statusCode : 500

  logger.error(String(current.message), { stack: current.stack as string | undefined })

  res.status(statusCode)

  return res
    .json({
      message: current.message,
      statusCode: current.statusCode
    })
    .end()
}

export const devErrors = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response | void => {
  void _req
  void _next

  const current = err as ErrorLike

  if (res.json) {
    logger.error(String(current.message))

    return res.json({
      name: current.name,
      message: current.message,
      statusCode: current.statusCode,
      stack: current.stack
    })
  }
}
