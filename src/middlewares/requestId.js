import { v4 as uuidv4 } from 'uuid'

/**
 * Attaches a unique request ID to every incoming request.
 * Sets `req.requestId` and the `X-Request-Id` response header.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4()
  req.requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}

export default requestId
