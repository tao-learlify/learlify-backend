jest.mock('utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('api/logger', () => ({
  Logger: {
    Service: { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() }
  }
}))

jest.mock('config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null)
}))

jest.mock('config/db', () => {
  const fn = jest.fn()
  fn.raw = jest.fn().mockResolvedValue([{ 1: 1 }])
  return { __esModule: true, default: fn }
})

import express from 'express'
import request from 'supertest'
import { prodErrors, devErrors } from 'middlewares/handlers'

function buildTestApp() {
  const app = express()

  app.use(express.json())

  app.get('/health', (_req, res) => {
    return res.status(200).json({ status: 'ok' })
  })

  app.get('/system', (_req, res) => {
    return res.status(200).json({ response: { now: new Date() }, statusCode: 200 })
  })

  app.post('/auth/login', (req, res, next) => {
    if (!req.body || !req.body.email) {
      const err = new Error('Bad Request')
      err.statusCode = 400
      return next(err)
    }
    return res.status(200).json({ token: 'mock-token' })
  })

  app.get('/protected', (req, res, next) => {
    if (!req.headers.authorization) {
      const err = new Error('Unauthorized')
      err.statusCode = 401
      return next(err)
    }
    return res.status(200).json({ ok: true })
  })

  app.get('/trigger-500', (_req, _res, next) => {
    const err = new Error('Internal server error')
    err.statusCode = 500
    next(err)
  })

  app.use(prodErrors)

  return app
}

describe('Express HTTP integration — pre-upgrade smoke', () => {
  let app

  beforeAll(() => {
    app = buildTestApp()
  })

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/health')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('status', 'ok')
    })
  })

  describe('GET /system', () => {
    it('returns 200 with response.now', async () => {
      const res = await request(app).get('/system')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('statusCode', 200)
      expect(res.body.response).toHaveProperty('now')
    })
  })

  describe('POST /auth/login', () => {
    it('returns 400 when body is empty', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({})
        .set('Content-Type', 'application/json')

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('statusCode', 400)
    })

    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: 'secret' })
        .set('Content-Type', 'application/json')

      expect(res.status).toBe(400)
    })
  })

  describe('Unauthenticated route', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/protected')

      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('statusCode', 401)
    })
  })

  describe('Unknown route — 404', () => {
    it('returns 404 for a route that does not exist', async () => {
      const res = await request(app).get('/api/v1/ruta-que-no-existe-xyz')

      expect(res.status).toBe(404)
    })
  })

  describe('Error handler', () => {
    it('prodErrors returns JSON with message and statusCode on next(err)', async () => {
      const res = await request(app).get('/trigger-500')

      expect(res.status).toBe(500)
      expect(res.body).toHaveProperty('message', 'Internal server error')
      expect(res.body).toHaveProperty('statusCode', 500)
    })

    it('prodErrors has fn.length === 4 and is recognized as Express error handler', () => {
      expect(prodErrors.length).toBe(4)
    })

    it('devErrors has fn.length === 4 (regression guard for pre-existing bug fix)', () => {
      expect(devErrors.length).toBe(4)
    })
  })
})

describe('devErrors — standalone unit', () => {
  it('responds with JSON containing name, message, statusCode and stack', () => {
    const err = new Error('dev error test')
    err.statusCode = 500
    err.name = 'TestError'

    const jsonFn = jest.fn().mockReturnValue(undefined)
    const res = { json: jsonFn }
    const req = {}
    const next = jest.fn()

    devErrors(err, req, res, next)

    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'dev error test',
        name: 'TestError',
        statusCode: 500
      })
    )
  })
})
