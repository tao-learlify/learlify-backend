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
      STRIPE_API_KEY: 'sk_test_mock',
      SENDGRID_APTIS_EMAIL: 'noreply@test.com'
    },
    getPackageExpirationDate: jest.fn().mockReturnValue('2027-01-01')
  }))
}))

jest.mock('api/users/users.service', () => {
  const instance = { getOne: jest.fn() }
  const UsersService = jest.fn(() => instance)
  UsersService.__instance = instance
  return { UsersService }
})

jest.mock('api/packages/packages.service', () => {
  const instance = {
    create: jest.fn(),
    getAll: jest.fn(),
    createTransactionablePackage: jest.fn(),
    getActiveSubscription: jest.fn(),
    updateAndCreateEvaluation: jest.fn()
  }
  const PackagesService = jest.fn(() => instance)
  PackagesService.__instance = instance
  return { PackagesService }
})

jest.mock('api/plans/plans.service', () => {
  const instance = { getOne: jest.fn() }
  const PlansService = jest.fn(() => instance)
  PlansService.__instance = instance
  return { PlansService }
})

jest.mock('api/mails/mails.service', () => ({
  MailService: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockResolvedValue(true)
  }))
}))

jest.mock('api/progress/progress.service', () => {
  const instance = { updateOne: jest.fn() }
  const ProgressService = jest.fn(() => instance)
  ProgressService.__instance = instance
  return { ProgressService }
})

jest.mock('api/categories/categories.service', () => {
  const instance = { getOne: jest.fn() }
  const CategoriesService = jest.fn(() => instance)
  CategoriesService.__instance = instance
  return { CategoriesService }
})

jest.mock('api/stripe/stripe.service', () => ({
  StripeService: {
    generatePaymentResponse: jest.fn().mockReturnValue({ success: true })
  }
}))

jest.mock('api/mails', () => ({
  sendgridConfig: { domain: 'https://test.com', email: 'noreply@test.com' }
}))

import { PackagesController } from 'api/packages/packages.controller'
import { UsersService } from 'api/users/users.service'
import { PackagesService } from 'api/packages/packages.service'
import { PlansService } from 'api/plans/plans.service'
import { CategoriesService } from 'api/categories/categories.service'
import { ProgressService } from 'api/progress/progress.service'

const usersService = UsersService.__instance
const packagesService = PackagesService.__instance
const plansService = PlansService.__instance
const categoriesService = CategoriesService.__instance
const progressService = ProgressService.__instance

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
    user: { id: 1, email: 'user@test.com', firstName: 'User' },
    ...overrides
  }
}

describe('PackagesController', () => {
  let controller

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new PackagesController()
  })

  describe('getAll()', () => {
    it('returns 200 with packages list for the current user', async () => {
      packagesService.getAll.mockResolvedValue([{ id: 1, isActive: true }])

      const req = makeReq({ query: { active: 'true' } })
      const res = makeRes()

      await controller.getAll(req, res)

      expect(packagesService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 })
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('returns 200 with empty array when no packages exist', async () => {
      packagesService.getAll.mockResolvedValue([])

      const req = makeReq({ query: {} })
      const res = makeRes()

      await controller.getAll(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('assign()', () => {
    it('creates package and returns 201 when user and plan exist', async () => {
      usersService.getOne.mockResolvedValue({
        id: 2,
        email: 'u@t.com',
        firstName: 'U'
      })
      plansService.getOne.mockResolvedValue({
        id: 1,
        name: 'IELTS Plan',
        writing: 2,
        speaking: 2,
        classes: 1
      })
      packagesService.create.mockResolvedValue({ id: 10, isActive: true })

      const req = makeReq({ query: { userId: '2', planId: '1' } })
      const res = makeRes()

      await controller.assign(req, res)

      expect(packagesService.create).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('throws NotFoundException when user does not exist', async () => {
      usersService.getOne.mockResolvedValue(null)

      const req = makeReq({ query: { userId: '99', planId: '1' } })
      const res = makeRes()

      await expect(controller.assign(req, res)).rejects.toThrow()
    })

    it('throws NotFoundException when plan does not exist', async () => {
      usersService.getOne.mockResolvedValue({ id: 2, email: 'u@t.com' })
      plansService.getOne.mockResolvedValue(null)

      const req = makeReq({ query: { userId: '2', planId: '99' } })
      const res = makeRes()

      await expect(controller.assign(req, res)).rejects.toThrow()
    })

    it('throws NotFoundException when packagesService.create returns falsy', async () => {
      usersService.getOne.mockResolvedValue({ id: 2, email: 'u@t.com' })
      plansService.getOne.mockResolvedValue({
        id: 1,
        name: 'Plan',
        writing: 1,
        speaking: 1,
        classes: 1
      })
      packagesService.create.mockResolvedValue(null)

      const req = makeReq({ query: { userId: '2', planId: '1' } })
      const res = makeRes()

      await expect(controller.assign(req, res)).rejects.toThrow()
    })
  })

  describe('create()', () => {
    it('returns 500 with cancelled flag when transaction is cancelled', async () => {
      packagesService.createTransactionablePackage.mockResolvedValue({
        cancelled: true
      })

      const req = makeReq({
        query: { planId: '1' },
        body: {
          paymentMethodId: 'pm_test',
          requiresAction: false,
          cancel: false
        }
      })
      const res = makeRes()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })

    it('returns 500 when transaction results in an error', async () => {
      packagesService.createTransactionablePackage.mockResolvedValue({
        error: true
      })

      const req = makeReq({
        query: { planId: '1' },
        body: {
          paymentMethodId: 'pm_test',
          requiresAction: false,
          cancel: false
        }
      })
      const res = makeRes()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })

    it('returns 201 with success payment response on happy path', async () => {
      packagesService.createTransactionablePackage.mockResolvedValue({
        plan: { name: 'Pro Plan' },
        intent: { status: 'succeeded' }
      })

      const req = makeReq({
        query: { planId: '1' },
        body: { paymentMethodId: 'pm_ok', requiresAction: false, cancel: false }
      })
      const res = makeRes()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('returns 201 without intent in response when requiresAction is true', async () => {
      packagesService.createTransactionablePackage.mockResolvedValue({
        plan: { name: 'Pro Plan' },
        intent: { status: 'requires_action', client_secret: 'sec_xyz' }
      })

      const req = makeReq({
        query: { planId: '1' },
        body: { paymentMethodId: 'pm_3ds', requiresAction: true, cancel: false }
      })
      const res = makeRes()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      const body = res.json.mock.calls[0][0]
      expect(body.response.intent).toBeUndefined()
    })
  })

  describe('update()', () => {
    it('returns 200 with progress update when needsRevision is false', async () => {
      categoriesService.getOne.mockResolvedValue({ id: 1, name: 'Reading' })
      packagesService.getAll.mockResolvedValue([{ id: 1, isActive: true }])
      progressService.updateOne.mockResolvedValue({ id: 5, done: true })

      const req = makeReq({
        query: { type: 'writings', category: 'Reading' },
        body: { needsRevision: false, progress: { id: 5, progressUpdated: {} } }
      })
      const res = makeRes()

      await controller.update(req, res)

      expect(progressService.updateOne).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('returns 201 with evaluation when needsRevision is true and active package exists', async () => {
      categoriesService.getOne.mockResolvedValue({ id: 1, name: 'Writing' })
      packagesService.getAll.mockResolvedValue([{ id: 1, isActive: true }])
      packagesService.getActiveSubscription.mockResolvedValue({
        id: 1,
        writings: 2
      })
      packagesService.updateAndCreateEvaluation.mockResolvedValue({
        evaluation: { id: 1 },
        update: { id: 1, writings: 1 }
      })

      const req = makeReq({
        query: { type: 'writings', category: 'Writing' },
        body: {
          needsRevision: true,
          progress: { id: 5, progressUpdated: { score: 80 } }
        }
      })
      const res = makeRes()

      await controller.update(req, res)

      expect(packagesService.updateAndCreateEvaluation).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('throws TransactionError when updateAndCreateEvaluation returns transactionError', async () => {
      categoriesService.getOne.mockResolvedValue({ id: 1, name: 'Writing' })
      packagesService.getAll.mockResolvedValue([{ id: 1, isActive: true }])
      packagesService.getActiveSubscription.mockResolvedValue({ id: 1 })
      packagesService.updateAndCreateEvaluation.mockResolvedValue({
        transactionError: true,
        details: 'DB rollback'
      })

      const req = makeReq({
        query: { type: 'writings', category: 'Writing' },
        body: { needsRevision: true, progress: { id: 5, progressUpdated: {} } }
      })
      const res = makeRes()

      await expect(controller.update(req, res)).rejects.toThrow()
    })

    it('throws PaymentException when needsRevision is true but no active package', async () => {
      categoriesService.getOne.mockResolvedValue({ id: 1, name: 'Writing' })
      packagesService.getAll.mockResolvedValue([])
      packagesService.getActiveSubscription.mockResolvedValue(null)

      const req = makeReq({
        query: { type: 'writings', category: 'Writing' },
        body: { needsRevision: true, progress: { id: 5, progressUpdated: {} } }
      })
      const res = makeRes()

      await expect(controller.update(req, res)).rejects.toThrow()
    })
  })
})
