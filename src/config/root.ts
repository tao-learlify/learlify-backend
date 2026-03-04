import type { Request, Response } from 'express'
import { Logger } from 'api/logger'

const root = {
  apiVersion: '/api/v1',
  cors: '*',
  handler: (_req: Request, res: Response): Response => {
    void _req

    return res.status(200).json({
      response: {
        now: new Date()
      },
      statusCode: 200
    })
  },
  json: {
    limit: '1mb'
  },
  limitRequest: {
    max: 200,
    message: 'Too many requests, should wait',
    windowMs: 15 * 60 * 1000
  },
  locales: ['es', 'en'],
  logger: {
    stream: {
      write: (message: string): void => {
        Logger.Service.info(message.trim())
      }
    }
  },
  main: '/system',
  urlencoded: {
    extended: true
  }
}

export default root
