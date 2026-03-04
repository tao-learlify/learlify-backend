/* eslint-disable no-console */
import Stripe from 'stripe'
import crypto from 'crypto'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { ConfigService } from 'api/config/config.service'
import { MODE } from 'common/process'
import type { ConfigurationProvider } from '@types'
import events from './stripe.events'
import type { StripeCustomer, StripeIntentInfo, PaymentResponse } from './stripe.types'

const privateStripeKey = Symbol('privateStripeKey')

class StripeService {
  logger: typeof Logger.Service
  provider: ConfigurationProvider
  declare [privateStripeKey]: Stripe

  constructor() {
    this.logger = Logger.Service
    this.provider = new ConfigService().provider
    this[privateStripeKey] = new (Stripe as unknown as new (key: string) => Stripe)(
      process.env.STRIPE_API_KEY!
    )
  }

  private get stripe(): Stripe {
    return this[privateStripeKey]
  }

  static generatePaymentResponse(intent: Stripe.PaymentIntent): PaymentResponse {
    if (
      intent.status === events.REQUIRES_ACTION &&
      intent.next_action!.type === events.USE_STRIPE_SDK
    ) {
      return {
        requiresAction: true,
        paymentIntentClientSecret: intent.client_secret!
      }
    } else if (intent.status === events.SUCCEEDED) {
      return {
        success: true
      }
    } else {
      return {
        error: 'Invalid PaymentIntent Status'
      }
    }
  }

  @Bind
  async addCustomer(customer: StripeCustomer) {
    const { firstName, lastName, stripeCustomerId } = customer

    if (stripeCustomerId) {
      return {
        exist: true
      }
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`addCustomer:${customer.email}`)
      .digest('hex')

    try {
      const membership = await this.stripe.customers.create(
        {
          source: customer.source,
          email: customer.email,
          description: `Customer ${firstName} ${lastName}`
        },
        { idempotencyKey }
      )
      this.logger.debug('stripe.service.membership', membership)

      return {
        membership: membership,
        exist: false
      }
    } catch (error) {
      this.logger.error('stripe.service.addCustomer', error)
      throw error
    }
  }

  @Bind
  async addIntentPayment(intentInfo: StripeIntentInfo) {
    this.logger.debug('intent', intentInfo)

    const stripe = this.stripe

    this.logger.debug('stripe.intent', intentInfo)

    const isProduction = process.env.NODE_ENV === MODE.production

    this.logger.debug('PaymentIntentProduction', { mode: isProduction })

    try {
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(
          `addIntentPayment:${intentInfo.paymentMethodId}:${intentInfo.amount}:${intentInfo.customer}`
        )
        .digest('hex')

      const intent = await stripe.paymentIntents.create(
        {
          description: `Charge for AptisGo ${intentInfo.name} Plan`,
          payment_method: intentInfo.paymentMethodId,
          amount: intentInfo.amount,
          currency: intentInfo.currency,
          confirmation_method: 'manual',
          payment_method_types: ['card'],
          confirm: true,
          receipt_email: intentInfo.email,
          customer: intentInfo.customer
        },
        { idempotencyKey }
      )

      this.logger.debug('addIntentPayment', intent)

      return intent
    } catch (error) {
      this.logger.error('addIntentPaymentError ', error)
      throw error
    }
  }

  @Bind
  async confirmIntentPayment(paymentIntentId: string) {
    this.logger.debug(paymentIntentId)

    const stripe = this.stripe

    try {
      const intent = await stripe.paymentIntents.confirm(paymentIntentId)

      this.logger.debug('intentPaymentConfirmed', intent)

      return intent
    } catch (err) {
      this.logger.error('intentPaymentConfirmationError', err)

      throw new Error((err as Error).message)
    }
  }

  @Bind
  async cancelPaymentIntent(paymentIntentId: string) {
    const stripe = this.stripe

    try {
      const intent = await stripe.paymentIntents.cancel(paymentIntentId)

      this.logger.error('intentPaymentCancel', intent)

      return intent
    } catch (err) {
      this.logger.error('intentPaymentCancelError', err)

      throw new Error((err as Error).message)
    }
  }
}

export { StripeService }
