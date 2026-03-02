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
      STRIPE_API_KEY: 'sk_test_mock',
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '30d',
      STRONG_HASH: 10
    }
  }))
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

jest.mock('common/process', () => ({
  MODE: { development: 'development', production: 'production', test: 'test' }
}))

describe('StripeService', () => {
  let mockCustomersCreate
  let mockPaymentIntentsCreate
  let StripeService

  beforeEach(() => {
    mockCustomersCreate = jest.fn()
    mockPaymentIntentsCreate = jest.fn()

    jest.mock('stripe', () => {
      return jest.fn().mockImplementation(() => ({
        customers: { create: mockCustomersCreate },
        paymentIntents: {
          create: mockPaymentIntentsCreate,
          confirm: jest.fn(),
          cancel: jest.fn()
        }
      }))
    })

    jest.resetModules()
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
      ConfigService: jest
        .fn()
        .mockImplementation(() => ({
          provider: { STRIPE_API_KEY: 'sk_test_mock' }
        }))
    }))
    jest.mock('common/process', () => ({ MODE: { production: 'production' } }))
    jest.mock('decorators', () => ({
      Bind: (_t, _p, d) => d,
      Injectable: c => c,
      CronSchedule: c => c,
      Readonly: (_t, _p, d) => d,
      Router: () => c => c,
      Controller: c => c
    }))

    const Stripe = require('stripe')
    mockCustomersCreate = jest.fn().mockResolvedValue({ id: 'cus_test123' })
    mockPaymentIntentsCreate = jest.fn().mockResolvedValue({
      id: 'pi_test123',
      status: 'succeeded'
    })
    Stripe.mockImplementation(() => ({
      customers: { create: mockCustomersCreate },
      paymentIntents: {
        create: mockPaymentIntentsCreate,
        confirm: jest.fn(),
        cancel: jest.fn()
      }
    }))

    StripeService = require('api/stripe/stripe.service').StripeService
  })

  describe('addCustomer()', () => {
    it('returns exist:true when stripeCustomerId is already set', async () => {
      const service = new StripeService()
      const result = await service.addCustomer({
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        stripeCustomerId: 'cus_existing'
      })
      expect(result).toEqual({ exist: true })
      expect(mockCustomersCreate).not.toHaveBeenCalled()
    })

    it('passes an idempotencyKey to stripe.customers.create', async () => {
      const service = new StripeService()
      await service.addCustomer({
        email: 'new@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        stripeCustomerId: null,
        source: 'tok_visa'
      })

      expect(mockCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@test.com' }),
        expect.objectContaining({ idempotencyKey: expect.any(String) })
      )
    })

    it('idempotencyKey is deterministic for same email', async () => {
      const service = new StripeService()
      const customerData = {
        email: 'same@test.com',
        firstName: 'A',
        lastName: 'B',
        stripeCustomerId: null,
        source: 'tok_visa'
      }

      await service.addCustomer(customerData)
      await service.addCustomer(customerData)

      const calls = mockCustomersCreate.mock.calls
      expect(calls[0][1].idempotencyKey).toBe(calls[1][1].idempotencyKey)
    })
  })

  describe('addIntentPayment()', () => {
    it('passes an idempotencyKey to stripe.paymentIntents.create', async () => {
      const service = new StripeService()
      await service.addIntentPayment({
        email: 'buyer@test.com',
        paymentMethodId: 'pm_test456',
        currency: 'EUR',
        amount: 2999,
        name: 'Pro Plan',
        customer: 'cus_test123'
      })

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2999 }),
        expect.objectContaining({ idempotencyKey: expect.any(String) })
      )
    })

    it('throws and logs when stripe throws', async () => {
      mockPaymentIntentsCreate.mockRejectedValue(new Error('card_declined'))
      const service = new StripeService()

      await expect(
        service.addIntentPayment({
          email: 'x@test.com',
          paymentMethodId: 'pm_fail',
          currency: 'EUR',
          amount: 100,
          name: 'Basic',
          customer: 'cus_abc'
        })
      ).rejects.toThrow('card_declined')
    })
  })

  describe('generatePaymentResponse()', () => {
    it('returns requiresAction when intent status is requires_action', () => {
      const intent = {
        status: 'requires_action',
        next_action: { type: 'use_stripe_sdk' },
        client_secret: 'secret_xyz'
      }
      const result = StripeService.generatePaymentResponse(intent)
      expect(result.requiresAction).toBe(true)
      expect(result.paymentIntentClientSecret).toBe('secret_xyz')
    })

    it('returns success:true when intent status is succeeded', () => {
      const intent = { status: 'succeeded' }
      const result = StripeService.generatePaymentResponse(intent)
      expect(result.success).toBe(true)
    })
  })
})

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  it('returns 400 when stripe signature verification fails', async () => {
    jest.doMock('utils/logger', () => ({
      __esModule: true,
      default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      }
    }))
    jest.doMock('api/logger', () => ({
      Logger: {
        Service: {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn()
        }
      }
    }))
    jest.doMock('stripe', () =>
      jest.fn().mockImplementation(() => ({
        webhooks: {
          constructEvent: jest.fn().mockImplementation(() => {
            throw new Error('No signatures found')
          })
        }
      }))
    )
    jest.doMock('config/db', () =>
      jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([1])
      })
    )

    const express = require('express')
    const testApp = express()
    const webhookRouter = require('api/stripe/stripe.webhook').default
    testApp.use(webhookRouter)

    const request = require('supertest')
    const res = await request(testApp)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'bad_sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'test' }))

    expect(res.status).toBe(400)
  })

  it('returns 200 with duplicate:true for already-processed events', async () => {
    const existingEvent = {
      event_id: 'evt_test123',
      type: 'payment_intent.succeeded'
    }
    jest.doMock('utils/logger', () => ({
      __esModule: true,
      default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      }
    }))
    jest.doMock('api/logger', () => ({
      Logger: {
        Service: {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn()
        }
      }
    }))
    jest.doMock('stripe', () =>
      jest.fn().mockImplementation(() => ({
        webhooks: {
          constructEvent: jest.fn().mockReturnValue({
            id: 'evt_test123',
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_test' } }
          })
        }
      }))
    )
    jest.doMock('config/db', () =>
      jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingEvent),
        insert: jest.fn().mockResolvedValue([1])
      })
    )

    const express = require('express')
    const testApp = express()
    const webhookRouter = require('api/stripe/stripe.webhook').default
    testApp.use(webhookRouter)

    const request = require('supertest')
    const res = await request(testApp)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })))

    expect(res.status).toBe(200)
    expect(res.body.duplicate).toBe(true)
  })

  it('returns 200 with received:true for a new valid event', async () => {
    jest.doMock('utils/logger', () => ({
      __esModule: true,
      default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      }
    }))
    jest.doMock('api/logger', () => ({
      Logger: {
        Service: {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn()
        }
      }
    }))
    jest.doMock('stripe', () =>
      jest.fn().mockImplementation(() => ({
        webhooks: {
          constructEvent: jest.fn().mockReturnValue({
            id: 'evt_new456',
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_new' } }
          })
        }
      }))
    )
    jest.doMock('config/db', () =>
      jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([1])
      })
    )

    const express = require('express')
    const testApp = express()
    const webhookRouter = require('api/stripe/stripe.webhook').default
    testApp.use(webhookRouter)

    const request = require('supertest')
    const res = await request(testApp)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })))

    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
    expect(res.body.duplicate).toBeUndefined()
  })
})
