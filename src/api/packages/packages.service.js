import { StripeService } from 'api/stripe/stripe.service'
import Package from './packages.model'
import Plan from 'api/plans/plans.model'
import User from 'api/users/users.model'
import Progress from 'api/progress/progress.model'
import Evaluation from 'api/evaluations/evaluations.model'
import STATUS from 'api/evaluations/evaluations.status'

import { exist } from 'functions'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import Notification from 'api/notifications/notifications.model'
import { NotificationContext } from 'api/notifications/notification.context'
import { AdminPrivateMessage } from 'metadata/notifications'
import { Socket } from 'modules'
import { NOTIFICATION } from 'gateways/events'

/**
 * @typedef {Object} Source
 * @property {number} userId
 * @property {number} planId
 */

const stripePrivateKey = Symbol('stripePrivateKey')
const relationShip = Symbol('relationShip')

export class PackagesService {
  constructor() {
    this[stripePrivateKey] = new StripeService()
    this.createTransactionablePackage = this.createTransactionablePackage.bind(
      this
    )
    this[relationShip] = {
      plan: {
        plan: {
          access: true
        }
      },
      users: {
        plan: {
          access: true
        },
        user: {
          $modify: ['withName']
        }
      }
    }
    this.logger = Logger.Service
    this.context = new NotificationContext()
  }

  /**
   * @param {[]} packages
   * @returns {Array<{ active?: true} | { inactive?: true}>}
   */
  static getActiveSubscriptions(packages) {
    return packages.reduce((current, next) => {
      if (next && next.length > 0) {
        return current.concat({ active: true })
      }

      return current.concat({ inactive: true })
    }, [])
  }

  /**
   * @param {Source} packageSource
   * @returns {Promise<Package>}
   */
  @Bind
  async create(packageSource) {
    const { users } = this[relationShip]

    const stream = new Socket()

    const pack = await Package.query()
      .select([
        'id',
        'isActive',
        'writings',
        'speakings',
        'classes',
        'createdAt',
        'updatedAt',
        'expirationDate',
        'total',
        'isNotified'
      ])
      .insertAndFetch(packageSource)
      .withGraphFetched(users)

    /**
     * @description
     * Notification Context.
     */
    const type = await this.context.getContextIdentifier({
      name: AdminPrivateMessage
    })

    /**
     * @description
     * Creating notification for user.
     */
    const notification = await Notification.query()
      .insertAndFetch({
        message: 'Default Package Notification',
        read: false,
        type: type.id,
        userId: packageSource.userId
      })
      .withGraphFetched({ notificationType: true })

    /**
     * Sending notification to the client as emit.
     */
    stream.socket.to(pack.user.email).emit(NOTIFICATION, notification)

    return pack
  }

  /**
   * @typedef {Object} TransactionablePackage
   * @property {{ id?: number }} user
   * @property {{ id?: number }} plan
   * @property {{ paymentMethodId?: string }} code
   * @property {string} expirationDate
   *
   * @param {TransactionablePackage} data
   * @param {boolean} requiresAction If true, will re-setup the payment intent.
   * @param {boolean} cancel If true paymentIntent needs to be cancelled.
   * @returns {Promise<Package>}
   */
  @Bind
  async createTransactionablePackage(data, requiresAction, cancel) {
    const { users } = this[relationShip]

    const stripe = this[stripePrivateKey]

    const knexInstance = Package.knex()

    try {
      const result = await knexInstance.transaction(async trx => {
        const user = await User.query(trx).findOne({
          id: data.user.id
        })

        const plan = await Plan.query(trx).findOne({
          id: data.plan.id
        })

        if (exist([user, plan])) {
          const customer = await stripe.addCustomer({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            source: data.code.stripeToken
          })

          if (!customer.exist) {
            await User.query(trx).patchAndFetchById(user.id, {
              stripeCustomerId: customer.membership.id
            })
          }

          if (cancel) {
            const intent = await stripe.cancelPaymentIntent(
              data.code.paymentMethodId
            )

            return {
              plan,
              package: null,
              cancelled: true,
              intent
            }
          }

          /**
           * @description
           * This only works if the 3D Security or Strong Customer Authentication wants to confirm payment.
           */
          if (requiresAction) {
            const intent = await this[stripePrivateKey].confirmIntentPayment(
              data.code.paymentMethodId
            )
            const pack = await Package.query(trx)
              .insertAndFetch({
                expirationDate: data.expirationDate,
                stripeChargeId: intent.id,
                isActive: true,
                userId: user.id,
                planId: plan.id,
                speakings: plan.speaking,
                writings: plan.writing,
                classes: plan.classes
              })
              .withGraphFetched(this[relationShip].plan)

            return {
              package: {
                ...pack
              },
              plan
            }
          }

          const intent = await this[stripePrivateKey].addIntentPayment({
            email: user.email,
            paymentMethodId: data.code.paymentMethodId,
            currency: plan.currency,
            amount: plan.price,
            name: plan.name,
            customer: customer.exist
              ? user.stripeCustomerId
              : customer.membership.id
          })

          const response = StripeService.generatePaymentResponse(intent)

          if (response.requiresAction) {
            return {
              package: null,
              intent
            }
          }

          const pack = await Package.query(trx)
            .insertAndFetch({
              expirationDate: data.expirationDate,
              stripeChargeId: intent.id,
              isActive: true,
              userId: user.id,
              planId: plan.id,
              speakings: plan.speaking,
              writings: plan.writing,
              classes: plan.classes
            })
            .withGraphFetched(users)

          return {
            package: {
              ...pack,
              plan
            },
            plan,
            intent
          }
        } else {
          throw new Error('User or Plan not found')
        }
      })

      return result
    } catch (err) {
      this.logger.error('createTransactionablePackage', {
        message: err.message,
        stack: err.stack
      })

      return {
        details: err.message,
        stack: err.stack,
        error: true
      }
    }
  }

  /**
   * @param {Source} source
   * @returns {Promise<Package []>}
   */
  @Bind
  getAll({ date, modelId, ...source }) {
    const { plan, users } = this[relationShip]

    if (modelId) {
      return Package.query()
        .withGraphJoined(plan)
        .where(source)
        .andWhere('plan.modelId', modelId)
    }

    if (date) {
      return date.ranges
        ? Package.query()
            .whereBetween('expirationDate', date.ranges)
            .andWhere({ isActive: true })
            .andWhere({ isNotified: false })
            .withGraphFetched(users)
        : Package.query()
            .where('expirationDate', '<', date.today)
            .andWhere({ isActive: true })
            .withGraphFetched(users)
    }

    return Package.query().where(source).withGraphFetched(plan)
  }

  /**
   * @param {{ userId?: number, competence?: 'speaking' | 'writing '}}
   * @returns {Promise<Package>}
   */

  getActiveSubscription({ userId, competence }) {
    if (competence) {
      return Package.query()
        .findOne({
          isActive: true,
          userId
        })
        .andWhere(`${competence}`, '>', 0)
    }

    return Package.query()
      .findOne({
        isActive: true,
        userId
      })
      .withGraphFetched('plan')
  }

  /**
   * @param {{ id: number }}
   * @returns {Promise<Package>}
   */
  getOne({ id, modelId, access, ...data }) {
    if (id) {
      return Package.query().findById(id)
    }

    if (modelId) {
      return Package.query()
        .findOne(data)
        .withGraphJoined('plan.access')
        .where('plan.modelId', modelId)
        .andWhere('plan:access.feature', access || 'EXAMS')
    }
    return Package.query().findOne(data)
  }

  updateOne({ id, ...data }) {
    if (id) {
      return Package.query().patchAndFetchById(id, data)
    }
    return Package.query().patchAndFetchBy(data)
  }

  /**
   * @param {{ package: {}, progress: {}, type: string, user: {} }} data
   */
  async updateAndCreateEvaluation(data) {
    try {
      const transaction = Package.knex().transaction(async trx => {
        const update = await Package.query(trx).patchAndFetchById(
          data.package.id,
          {
            [data.type]: data.package[data.type] - 1
          }
        )

        this.logger.warn('update', {
          speakings: update.speakings,
          writings: update.writings,
          id: update.id
        })

        await Progress.query(trx).patchAndFetchById(data.progress.id, {
          examJSON: data.progress.examJSON
        })

        const evaluation = await Evaluation.query(trx).insertAndFetch({
          userId: data.user.id,
          progressId: data.progress.id,
          categoryId: data.category.id,
          status: STATUS.PENDING
        })

        this.logger.info('evaluation', evaluation)

        return {
          update,
          evaluation
        }
      })

      return transaction
    } catch (err) {
      return {
        details: err,
        transactionError: true
      }
    }
  }

  /**
   * @param {{}} data
   * @param {string []} features
   */
  async getSubscriptions(data, features) {
    const packages = await this.getAll(data)

    const plans = packages.filter(({ plan }) =>
      plan.access.find(({ feature }) => features.includes(feature))
    )

    const isActive = plans.length > 0

    return isActive
  }

  /**
   * @param {Package}
   */
  async getWritingsAndSpeakings({ userId }) {
    const count = {}

    const speakings = await Package.query()
      .count('speakings as speakings')
      .where({ userId, isActive: true })

    const writings = await Package.query()
      .count('writings as writings')
      .where({ userId, isActive: true })

    if (speakings && speakings[0]) {
      count.speakings = speakings[0].speakings
    }

    if (speakings && writings[0]) {
      count.writings = writings[0].writings
    }

    return count
  }
}
