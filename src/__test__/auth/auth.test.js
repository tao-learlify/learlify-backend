import bcrypt from 'bcrypt'

// Break circular: authentication.service → decorators → middlewares → ... → routes.js
jest.mock('decorators', () => ({
  Injectable: cls => cls,
  Bind: (_t, _p, descriptor) => descriptor,
  Readonly: (_t, _p, descriptor) => descriptor,
  CronSchedule: cls => cls,
  Router: () => cls => cls,
  Controller: cls => cls
}))

jest.mock('config/redis', () => ({
  getRedisClient: jest.fn()
}))

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('api/config/config.service', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    provider: {
      JWT_SECRET: 'test-secret-key-for-jest-unit-tests',
      JWT_EXPIRATION: '30d',
      STRONG_HASH: 10
    }
  }))
}))

import { AuthenticationService } from 'api/authentication/authentication.service'
import { addToBlocklist, isTokenBlocked } from 'api/jwt/jwt.blocklist'
import { getRedisClient } from 'config/redis'
import jwt from 'jsonwebtoken'

describe('AuthenticationService', () => {
  let service

  beforeEach(() => {
    service = new AuthenticationService()
  })

  describe('hash()', () => {
    it('returns a bcrypt hash string', async () => {
      const hash = await service.hash('my-password')
      expect(typeof hash).toBe('string')
      expect(hash).toMatch(/^\$2[ab]\$/)
    })

    it('generates different hashes for the same input (salt)', async () => {
      const h1 = await service.hash('password')
      const h2 = await service.hash('password')
      expect(h1).not.toBe(h2)
    })
  })

  describe('compareHash()', () => {
    it('returns true when password matches hash', async () => {
      const password = 'correct-password'
      const hash = await bcrypt.hash(password, 10)
      const result = await service.compareHash(password, hash)
      expect(result).toBe(true)
    })

    it('returns false when password does not match hash', async () => {
      const hash = await bcrypt.hash('real-password', 10)
      const result = await service.compareHash('wrong-password', hash)
      expect(result).toBe(false)
    })
  })

  describe('generateRandomPassword()', () => {
    it('returns an object with value and null hash when useHash is false', async () => {
      const result = await service.generateRandomPassword({ useHash: false })
      expect(result).toHaveProperty('value')
      expect(result.hash).toBeNull()
      expect(typeof result.value).toBe('string')
      expect(result.value.length).toBeGreaterThan(0)
    })

    it('returns a hashed password when useHash is true', async () => {
      const result = await service.generateRandomPassword({ useHash: true })
      expect(result).toHaveProperty('value')
      expect(result).toHaveProperty('hash')
      expect(result.hash).toMatch(/^\$2[ab]\$/)
      const matches = await bcrypt.compare(result.value, result.hash)
      expect(matches).toBe(true)
    })
  })

  describe('encrypt() + decrypt()', () => {
    it('signs a payload and decodes it back', () => {
      const payload = { id: 42, email: 'test@example.com' }
      const token = service.encrypt(payload, {})
      expect(typeof token).toBe('string')
    })

    it('includes clientConfig sanitization when clientConfig is true', () => {
      const payload = {
        id: 42,
        email: 'test@example.com',
        password: 'secret',
        stripeCustomerId: 'cus_abc',
        googleId: 'g123',
        facebookId: 'f456'
      }
      const token = service.encrypt(payload, { clientConfig: true })
      const decoded = jwt.decode(token)
      expect(decoded.password).toBeUndefined()
      expect(decoded.stripeCustomerId).toBeUndefined()
      expect(decoded.googleId).toBeUndefined()
      expect(decoded.facebookId).toBeUndefined()
      expect(decoded.email).toBe('test@example.com')
    })
  })
})

describe('JWT Blocklist', () => {
  const secret = 'test-blocklist-secret'
  const payload = { id: 1, email: 'user@test.com' }

  function makeToken(expiresIn = '1h') {
    return jwt.sign(payload, secret, { expiresIn })
  }

  describe('addToBlocklist()', () => {
    it('calls redis.set with correct key format and EX flag when redis is available', async () => {
      const mockRedis = {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null)
      }
      getRedisClient.mockReturnValue(mockRedis)

      const token = makeToken('1h')
      await addToBlocklist(token)

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^blocklist:/),
        '1',
        'EX',
        expect.any(Number)
      )
    })

    it('returns false and logs warning when Redis is unavailable', async () => {
      getRedisClient.mockReturnValue(null)
      const token = makeToken('1h')
      const result = await addToBlocklist(token)
      expect(result).toBe(false)
    })

    it('returns true and skips set for already-expired tokens', async () => {
      const mockRedis = { set: jest.fn() }
      getRedisClient.mockReturnValue(mockRedis)

      const expiredToken = jwt.sign(payload, secret, { expiresIn: -1 })
      const result = await addToBlocklist(expiredToken)

      expect(result).toBe(true)
      expect(mockRedis.set).not.toHaveBeenCalled()
    })
  })

  describe('isTokenBlocked()', () => {
    it('returns true when token key exists in Redis', async () => {
      const mockRedis = { get: jest.fn().mockResolvedValue('1') }
      getRedisClient.mockReturnValue(mockRedis)

      const token = makeToken()
      const result = await isTokenBlocked(token)
      expect(result).toBe(true)
    })

    it('returns false when token key does not exist in Redis', async () => {
      const mockRedis = { get: jest.fn().mockResolvedValue(null) }
      getRedisClient.mockReturnValue(mockRedis)

      const token = makeToken()
      const result = await isTokenBlocked(token)
      expect(result).toBe(false)
    })

    it('returns false when Redis is not configured', async () => {
      getRedisClient.mockReturnValue(null)
      const result = await isTokenBlocked(makeToken())
      expect(result).toBe(false)
    })
  })
})

describe('GET /health', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns 200 with status ok when DB and Redis are up', async () => {
    jest.mock('config/db', () => ({ raw: jest.fn().mockResolvedValue(true) }))
    jest.mock('config/redis', () => ({
      getRedisClient: () => ({ ping: jest.fn().mockResolvedValue('PONG') })
    }))
    jest.mock('utils/logger', () => ({
      __esModule: true,
      default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
    }))

    const express = require('express')
    const testApp = express()
    const healthRouter = require('api/health/health.routes').default
    testApp.use(healthRouter)

    const request = require('supertest')
    const res = await request(testApp).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.checks.database.status).toBe('ok')
  })

  it('returns 503 when DB is down', async () => {
    jest.mock('config/db', () => ({
      raw: jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    }))
    jest.mock('config/redis', () => ({ getRedisClient: () => null }))
    jest.mock('utils/logger', () => ({
      __esModule: true,
      default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
    }))

    const express = require('express')
    const testApp = express()
    const healthRouter = require('api/health/health.routes').default
    testApp.use(healthRouter)

    const request = require('supertest')
    const res = await request(testApp).get('/health')

    expect(res.status).toBe(503)
    expect(res.body.status).toBe('down')
  })

  it('returns 200 degraded when DB is up but Redis is down', async () => {
    jest.mock('config/db', () => ({ raw: jest.fn().mockResolvedValue(true) }))
    jest.mock('config/redis', () => ({
      getRedisClient: () => ({
        ping: jest.fn().mockRejectedValue(new Error('timeout'))
      })
    }))
    jest.mock('utils/logger', () => ({
      __esModule: true,
      default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
    }))

    const express = require('express')
    const testApp = express()
    const healthRouter = require('api/health/health.routes').default
    testApp.use(healthRouter)

    const request = require('supertest')
    const res = await request(testApp).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('degraded')
  })

  it('returns 200 with redis unconfigured when REDIS_URL is not set', async () => {
    jest.mock('config/db', () => ({ raw: jest.fn().mockResolvedValue(true) }))
    jest.mock('config/redis', () => ({ getRedisClient: () => null }))
    jest.mock('utils/logger', () => ({
      __esModule: true,
      default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
    }))

    const express = require('express')
    const testApp = express()
    const healthRouter = require('api/health/health.routes').default
    testApp.use(healthRouter)

    const request = require('supertest')
    const res = await request(testApp).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.checks.redis.status).toBe('unconfigured')
  })
})
