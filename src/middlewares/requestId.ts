import type { RequestHandler } from 'express'
import { v4 as uuidv4 } from 'uuid'

const requestId: RequestHandler = (req, res, next): void => {
  const id = req.headers['x-request-id'] || uuidv4()
  req.requestId = id as string
  res.setHeader('X-Request-Id', id)
  next()
}

export default requestId
