// Prevent knex from opening a real MySQL connection
jest.mock('config/db', () => {
  const mock = jest.fn()
  mock.raw = jest.fn().mockResolvedValue([])
  return { __esModule: true, default: mock }
})

jest.mock('config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
  closeRedisClient: jest.fn()
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

// AmazonWebServices.fileInterceptor accesses ConfigService.provider.MULTIPART_FORMDATA
// at httpConsumer() time (construction of route middleware array). Mock the whole
// service to give it a no-op passthrough middleware instead.
jest.mock('api/aws/aws.service', () => ({
  AmazonWebServices: jest.fn().mockImplementation(() => ({
    fileInterceptor: jest
      .fn()
      .mockReturnValue(jest.fn().mockImplementation((req, res, next) => next()))
  }))
}))

// JWT guard: skip DB look-up, return a synthetic user
jest.mock('api/users/users.service', () => ({
  UsersService: jest.fn().mockImplementation(() => ({
    getOne: jest.fn().mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: { name: 'student' },
      googleId: null,
      facebookId: null,
      stripeCustomerId: null,
      lastLogin: new Date()
    })
  }))
}))

jest.mock('api/jwt/jwt.blocklist', () => ({
  isTokenBlocked: jest.fn().mockResolvedValue(false),
  addToBlocklist: jest.fn().mockResolvedValue(undefined)
}))

// Plans controller dependencies
jest.mock('api/plans/plans.service', () => ({
  PlansService: jest.fn().mockImplementation(() => ({
    getAll: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null)
  }))
}))

jest.mock('api/models/models.service', () => ({
  ModelsService: jest.fn().mockImplementation(() => ({
    getOne: jest.fn().mockResolvedValue({ id: 1, name: 'IELTS' })
  }))
}))

jest.mock('api/packages/packages.service', () => ({
  PackagesService: jest.fn().mockImplementation(() => ({
    getAll: jest.fn().mockResolvedValue([])
  }))
}))

import request from 'supertest'
import jwt from 'jsonwebtoken'
import { core } from 'core/config.core'

beforeAll(() => {
  // Sign with the real JWT_SECRET loaded from .env by dotenv so the guard
  // accepts the token using the same secret ConfigService reads.
  process.env.X_AUTH_TOKEN = `Bearer ${jwt.sign(
    { id: 1 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256' }
  )}`
})

it('Get all plans', async () => {
  const response = await request(core.app)
    .get('/api/v1/plans?model=IELTS')
    .set('Authorization', process.env.X_AUTH_TOKEN)

  expect(response.status).toBe(200)
})
