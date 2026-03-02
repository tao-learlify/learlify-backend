jest.mock('decorators', () => ({
  Injectable: cls => cls,
  Bind: (_t, _p, descriptor) => descriptor,
  Readonly: (_t, _p, descriptor) => descriptor,
  CronSchedule: cls => cls,
  Router: () => cls => cls,
  Controller: cls => cls
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

jest.mock('api/logger', () => ({
  Logger: {
    Service: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
  }
}))

jest.mock('api/config/config.service', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    provider: {
      JWT_SECRET: 'ctrl-test-secret-32-chars-min-ok',
      JWT_EXPIRATION: '30d',
      STRONG_HASH: 10,
      SENDGRID_APTIS_EMAIL: 'noreply@test.com'
    },
    getLastLogin: jest.fn().mockReturnValue('2026-01-01')
  }))
}))

jest.mock('api/users/users.service', () => {
  const instance = {
    getOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn()
  }
  const UsersService = jest.fn(() => instance)
  UsersService.__instance = instance
  return { UsersService }
})

jest.mock('api/roles/roles.services', () => ({
  RolesService: jest.fn().mockImplementation(() => ({
    findOne: jest.fn().mockResolvedValue({ id: 1, name: 'User' })
  }))
}))

jest.mock('api/mails/mails.service', () => ({
  MailService: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockResolvedValue(true)
  }))
}))

jest.mock('api/mails', () => ({
  sendgridConfig: {
    domain: 'https://test.aptis.com',
    email: 'noreply@test.com'
  }
}))

jest.mock('api/jwt/jwt.blocklist', () => ({
  addToBlocklist: jest.fn().mockResolvedValue(true)
}))

jest.mock('metadata/roles', () => ({
  Roles: { User: 'User', Admin: 'Admin' }
}))

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { AuthenticationController } from 'api/authentication/authentication.controller'
import { addToBlocklist } from 'api/jwt/jwt.blocklist'
import { UsersService } from 'api/users/users.service'

const SECRET = 'ctrl-test-secret-32-chars-min-ok'
const users = UsersService.__instance

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn(), __: jest.fn(k => k) }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

function makeReq(overrides = {}) {
  return {
    body: {},
    query: {},
    headers: {},
    locale: 'en',
    user: null,
    ...overrides
  }
}

describe('AuthenticationController', () => {
  let controller

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AuthenticationController()
  })

  describe('signIn()', () => {
    it('returns 200 with token when credentials are valid', async () => {
      const hash = await bcrypt.hash('pass123', 10)
      users.getOne.mockResolvedValue({
        id: 1,
        email: 't@t.com',
        password: hash,
        role: 'User',
        model: 'IELTS'
      })
      users.updateOne.mockResolvedValue({})

      const req = makeReq({ body: { email: 't@t.com', password: 'pass123' } })
      const res = makeRes()

      await controller.signIn(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200 })
      )
    })

    it('throws when password does not match', async () => {
      const hash = await bcrypt.hash('correct', 10)
      users.getOne.mockResolvedValue({
        id: 2,
        email: 't@t.com',
        password: hash,
        role: {},
        model: {}
      })

      const req = makeReq({ body: { email: 't@t.com', password: 'wrong' } })
      const res = makeRes()

      await expect(controller.signIn(req, res)).rejects.toThrow()
    })

    it('throws when user does not exist', async () => {
      users.getOne.mockResolvedValue(null)

      const req = makeReq({ body: { email: 'x@x.com', password: 'pw' } })
      const res = makeRes()

      await expect(controller.signIn(req, res)).rejects.toThrow()
    })
  })

  describe('logout()', () => {
    it('adds Bearer token to blocklist and returns 200', async () => {
      const req = makeReq({ headers: { authorization: 'Bearer mytoken123' } })
      const res = makeRes()

      await controller.logout(req, res)

      expect(addToBlocklist).toHaveBeenCalledWith('mytoken123')
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('returns 200 without blocklist call when no header present', async () => {
      const req = makeReq({ headers: {} })
      const res = makeRes()

      await controller.logout(req, res)

      expect(addToBlocklist).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('returns 200 without blocklist call for non-Bearer auth scheme', async () => {
      const req = makeReq({ headers: { authorization: 'Basic abc123' } })
      const res = makeRes()

      await controller.logout(req, res)

      expect(addToBlocklist).not.toHaveBeenCalled()
    })
  })

  describe('signUp()', () => {
    it('throws ConflictException when email is already registered', async () => {
      users.getOne.mockResolvedValue({ id: 1, email: 'exists@t.com' })

      const req = makeReq({
        body: {
          email: 'exists@t.com',
          firstName: 'A',
          lastName: 'B',
          password: 'pw'
        }
      })
      const res = makeRes()

      await expect(controller.signUp(req, res)).rejects.toThrow()
    })

    it('creates user and returns 201 for a new email', async () => {
      const user = { id: 5, email: 'new@t.com', firstName: 'A', lastName: 'B' }
      users.getOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user)
      users.create.mockResolvedValue(user)

      const req = makeReq({
        body: {
          email: 'new@t.com',
          firstName: 'A',
          lastName: 'B',
          password: 'pw'
        }
      })
      const res = makeRes()

      await controller.signUp(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('refreshToken()', () => {
    it('returns 200 with new token for a valid token', async () => {
      const token = jwt.sign({ id: 5, email: 'u@t.com' }, SECRET, {
        expiresIn: '1h'
      })
      users.getOne.mockResolvedValue({ id: 5, email: 'u@t.com' })

      const req = makeReq({ body: { token } })
      const res = makeRes()

      await controller.refreshToken(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('throws ForbiddenException when token is invalid or expired', async () => {
      const req = makeReq({ body: { token: 'bad.token.value' } })
      const res = makeRes()

      await expect(controller.refreshToken(req, res)).rejects.toThrow()
    })

    it('throws NotFoundException when user no longer exists', async () => {
      const token = jwt.sign({ id: 999 }, SECRET, { expiresIn: '1h' })
      users.getOne.mockResolvedValue(null)

      const req = makeReq({ body: { token } })
      const res = makeRes()

      await expect(controller.refreshToken(req, res)).rejects.toThrow()
    })
  })

  describe('verification()', () => {
    it('throws BadRequestException for a garbage code', async () => {
      const req = makeReq({ query: { code: 'not.a.real.token' } })
      const res = makeRes()

      await expect(controller.verification(req, res)).rejects.toThrow()
    })

    it('updates isVerified and returns 201 for a valid code', async () => {
      const code = jwt.sign({ email: 'v@t.com' }, SECRET, { expiresIn: '1d' })
      const user = { id: 10, email: 'v@t.com' }
      users.getOne.mockResolvedValue(user)
      users.updateOne.mockResolvedValue({ ...user, isVerified: true })

      const req = makeReq({ query: { code } })
      const res = makeRes()

      await controller.verification(req, res)

      expect(users.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: true })
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('throws NotFoundException when verified email is not in DB', async () => {
      const code = jwt.sign({ email: 'ghost@t.com' }, SECRET, {
        expiresIn: '1d'
      })
      users.getOne.mockResolvedValue(null)

      const req = makeReq({ query: { code } })
      const res = makeRes()

      await expect(controller.verification(req, res)).rejects.toThrow()
    })
  })

  describe('forgot()', () => {
    it('returns 404 when email is not registered', async () => {
      users.getOne.mockResolvedValue(null)

      const req = makeReq({ query: { email: 'nobody@t.com' } })
      const res = makeRes()

      await controller.forgot(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('sends reset email and returns 200 when user is found', async () => {
      const user = { id: 3, email: 'u@t.com', firstName: 'User' }
      users.getOne.mockResolvedValue(user)

      const req = makeReq({ query: { email: 'u@t.com' } })
      const res = makeRes()

      await controller.forgot(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('resetPassword()', () => {
    it('throws BadRequestException when code is invalid', async () => {
      const req = makeReq({ body: { code: 'bad-code', password: 'newpass' } })
      const res = makeRes()

      await expect(controller.resetPassword(req, res)).rejects.toThrow()
    })

    it('updates password and returns 201 for a valid code', async () => {
      const code = jwt.sign({ id: 7, email: 'r@t.com' }, SECRET, {
        expiresIn: '1d'
      })
      const user = { id: 7, email: 'r@t.com' }
      users.getOne.mockResolvedValue(user)
      users.updateOne.mockResolvedValue(user)

      const req = makeReq({ body: { code, password: 'newpass123' } })
      const res = makeRes()

      await controller.resetPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('demoUser()', () => {
    it('returns 200 with a token for the demo account', async () => {
      const user = { id: 99, email: 'aptisgo@noreply', role: 'User' }
      users.getOne.mockResolvedValue(user)
      users.updateOne.mockResolvedValue(user)

      const req = makeReq()
      const res = makeRes()

      await controller.demoUser(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })
})
