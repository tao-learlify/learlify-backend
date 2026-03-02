/* eslint-disable no-console */
import Stripe from 'stripe'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { ConfigService } from 'api/config/config.service'
import { MODE } from 'common/process'
import events from './stripe.events'

const privateStripeKey = Symbol('privateStripeKey')

/**
 * @typedef {Object} Customer
 * @property {string} source
 * @property {string} stripeCustomerId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 */

/**
 * @typedef {Object} Charge
 * @property {number} amount
 * @property {'USD' | 'EUR'} currency
 * @property {string} name
 * @property {string} customer
 */

class StripeService {
  constructor() {
    this.logger = Logger.Service
    this.provider = new ConfigService().provider
    this[privateStripeKey] = new Stripe(process.env.STRIPE_API_KEY)
  }

  /**
   * @see https://stripe.com/docs/payments/payment-intents/migration-synchronous
   * @param {{}} intent
   */
  static generatePaymentResponse(intent) {
    if (
      intent.status === events.REQUIRES_ACTION &&
      intent.next_action.type === events.USE_STRIPE_SDK
    ) {
      return {
        requiresAction: true,
        paymentIntentClientSecret: intent.client_secret
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

  /**
   * @param {Customer} customer
   */
  @Bind
  async addCustomer(customer) {
    const { firstName, lastName, stripeCustomerId } = customer

    if (stripeCustomerId) {
      return {
        exist: true
      }
    }

    try {
      const membership = await this[privateStripeKey].customers.create({
        source: customer.source,
        email: customer.email,
        description: `Customer ${firstName} ${lastName}`
      })
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

  /**
   * @param {Charge} intentInfo
   */
  @Bind
  async addIntentPayment(intentInfo) {
    this.logger.debug('intent', intentInfo)

    const stripe = this[privateStripeKey]

    this.logger.debug('stripe.intent', intentInfo)

    const isProduction = process.env.NODE_ENV === MODE.production

    this.logger.debug('PaymentIntentProduction', { mode: isProduction })

    try {
      const intent = await stripe.paymentIntents.create({
        description: `Charge for AptisGo ${intentInfo.name} Plan`,
        payment_method: intentInfo.paymentMethodId,
        amount: intentInfo.amount,
        currency: intentInfo.currency,
        confirmation_method: 'manual',
        payment_method_types: ['card'],
        confirm: true,
        receipt_email: intentInfo.email,
        customer: intentInfo.customer
      })

      this.logger.debug('addIntentPayment', intent)

      return intent
    } catch (error) {
      this.logger.error('addIntentPaymentError ', error)
      throw error
    }
  }

  /**
   * @param {string} paymentIntentId
   */
  @Bind
  async confirmIntentPayment(paymentIntentId) {
    this.logger.debug(paymentIntentId)

    const stripe = this[privateStripeKey]

    try {
      const intent = await stripe.paymentIntents.confirm(paymentIntentId)

      this.logger.debug('intentPaymentConfirmed', intent)

      return intent
    } catch (err) {
      this.logger.error('intentPaymentConfirmationError', err)

      throw new Error(err.message)
    }
  }

  @Bind
  async cancelPaymentIntent(paymentIntentId) {
    const stripe = this[privateStripeKey]

    try {
      const intent = await stripe.paymentIntents.cancel(paymentIntentId)

      this.logger.error('intentPaymentCancel', intent)

      return intent
    } catch (err) {
      this.logger.error('intentPaymentCancelError', err)

      throw new Error(err.message)
    }
  }
}

export { StripeService }
