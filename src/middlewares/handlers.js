import logger from '../utils/logger'
import _isEmpty from 'lodash/isEmpty'

/**
 * Middleware to handle any other types of errors
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
export function validationErrorHandler(err, req, res, next) {
  if (err.isJoi) {
    logger.error(
      'An error related to a joi validation just ocurred',
      err.details
    )

    err.status = 400
    err.message = 'Your request did not pass the validation'
    err.details = err.details.map(err => {
      return {
        message: err.message,
        param: err.path.join('.')
      }
    })
  }

  next(err)
}

/**
 * Error middleware for production enviroment, it will not provide
 * the stack trace
 * @param {Error} err
 * @param {object} _req
 * @param {object} res
 * @param {function} _next
 */
export const prodErrors = (err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack })

  res.status(err.statusCode || 500)

  return res
    .json({
      message: err.message,
      statusCode: err.statusCode
    })
    .end()
}

/**
 * Error middleware for dev enviroment.
 * @param {Error} err
 * @param {object} _req
 * @param {object} res
 * @param {function} _next
 */
export const devErrors = (err, _req, res, _next) => {
  if (res.json) {
    logger.error(err.message)

    return res.json({
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack
    })
  }
}
