import { randomUUID } from 'crypto'
import moment from 'moment-timezone'

import { Logger } from 'api/logger'
import { StripeService } from 'api/stripe/stripe.service'
import { ConfigService } from 'api/config/config.service'
import Gift from 'api/gifts/gifts.model'
import User from 'api/users/users.model'
import Package from 'api/packages/packages.model'

/**
 * @typedef {Object} TransactionableGift
 * @property {{ id?: number, email?: string, firstName?: string, lastName?: string  }} gifter
 * @property {{ id?: number, email?: string, firstName?: string, lastName?: string  }} user
 * @property {{ id?: number }} plan
 * @property {{ paymentMethodId?: string }} stripe
 */

export class GiftsService {
  constructor() {
    this.stripeService = new StripeService()
    this.configService = new ConfigService()
    this.logger = Logger.Service
    this.createTransactionableGift = this.createTransactionableGift.bind(this)
  }

  /**
   * @public
   * @returns {string}
   */
  createRandomGiftCode() {
    const { provider } = this.configService

    return `${provider.uniqid}${randomUUID()}`
  }

  /**
   * @param {TransactionableGift} giftInfo
   * @param {boolean} requiresAction
   * @returns {Promise<Gift>}
   */
  async createTransactionableGift(giftInfo, requiresAction = false) {
    const { gifter, user, plan, stripe } = giftInfo

    try {
      const returnValue = await Gift.knex().transaction(async trx => {
        this.logger.debug('createTransactionableGift Start')

        const customer = await this.stripeService.addCustomer({
          email: gifter.email,
          firstName: gifter.firstName,
          lastName: gifter.lastName,
          source: stripe.source,
          stripeCustomerId: gifter.stripeCustomerId
        })

        this.logger.debug('customer', customer)

        if (!customer.exist) {
          await User.query(trx).patchAndFetchById(gifter.id, {
            stripeCustomerId: customer.membership.id
          })
        }


        if (requiresAction) {
          const intent = await this.stripeService.confirmIntentPayment(giftInfo.stripe.paymentMethodId)

          this.logger.debug('intent', intent)

          const gift = await Gift.query(trx).insertAndFetch({
            email: user.email,
            planId: plan.id,
            gifter: gifter.id,
            serial: serial
          })

          return {
            gift,
            customer,
          }
        }

        const intent = await this.stripeService.addIntentPayment({
          paymentMethodId: stripe.paymentMethod,
          amount: plan.price,
          currency: plan.currency,
          name: plan.name,
          customer: customer.exist
            ? gifter.stripeCustomerId
            : customer.membership.id
        })

        this.logger.debug('intent', intent)


        const response = StripeService.generatePaymentResponse(intent)

        if (response.requiresAction) {
          return {
            gift: null,
            intent
          }
        }

        const gift = await Gift.query(trx).insertAndFetch({
          email: user.email,
          planId: plan.id,
          gifter: gifter.id,
          serial: serial
        })


        const serial = this.createRandomGiftCode()

        this.logger.debug('serial', serial)

        return {
          customer,
          intent,
          serial,
          gift
        }
      })

      return returnValue
    } catch (error) {
      this.logger.error('createTransactionableGift Error', error)

      return {
        transactionError: true,
        details: error
      }
    }
  }

  /**
   * @param {Object} gift
   * @param {Object} user
   * @returns {Promise<Gift>}
   */
  async giftExchangeTransaction(gift, user) {
    try {
      const transaction = await Gift.knex().transaction(async trx => {
        this.logger.debug('giftExchangeTransaction Start')

        const giftUpdate = await Gift.query(trx)
          .patchAndFetchById(gift.id, {
            expired: true
          })
          .withGraphFetched({
            plans: true
          })

        this.logger.debug('giftUpdate', giftUpdate)

        const expirationDate = moment()
          .tz(this.configService.provider.TZ)
          .add(30, 'days')
          .format('YYYY-MM-DD')

        const userPackage = await Package.query(trx).insertAndFetch({
          total: giftUpdate.plans.price,
          speakings: giftUpdate.plans.speaking,
          writings: giftUpdate.plans.writing,
          isActive: true,
          planId: giftUpdate.plans.id,
          expirationDate,
          userId: user.id
        })
        this.logger.debug('userPackage', userPackage)

        this.logger.debug('giftExchangeTransaction End')

        return userPackage
      })

      return transaction
    } catch (error) {
      this.logger.error('giftExchangeTransaction Error', error)

      return {
        transactionError: true,
        details: error
      }
    }
  }

  /**
   * @param {Source} gift
   * @returns {Promise<Gift>}
   */
  getOne(gift) {
    if (gift.id) {
      return Gift.query().findById(gift.id).select(['id', 'email', 'expired'])
    }

    return Gift.query().findOne(gift).select(['id', 'email', 'expired'])
  }

  /**
   * @param {Source} gift
   * @returns {Promise<Gift>}
   */
  updateOne({ id, ...data }) {
    if (id) {
      return Gift.query().patchAndFetchById(id, data).withGraphFetched({
        plans: true
      })
    }

    return Gift.query().patchAndFetch(data).withGraphFetched({
      plans: true
    })
  }
}
