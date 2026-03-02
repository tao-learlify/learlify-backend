import { Bind, Injectable } from 'decorators'
import { Categories } from 'metadata/categories'
import { EvaluationCompleted, Feedback } from 'metadata/notifications'
import { Socket } from 'modules'

import CloudStorage from 'api/cloudstorage/cloudstorage.model'
import Evaluation from 'api/evaluations/evaluations.model'
import Notification from 'api/notifications/notifications.model'
import Package from 'api/packages/packages.model'
import Progress from './progress.model'
import Stats from 'api/stats/stats.model'

import STATUS from 'api/evaluations/evaluations.status'

import { AmazonWebServices } from 'api/aws/aws.service'
import { ConfigService } from 'api/config/config.service'
import { NotificationContext } from 'api/notifications/notification.context'
import { NOTIFICATION } from 'gateways/events'

/**
 * @typedef {Object} Source
 * @property {number} examId
 * @property {number} userId
 * @property {number} id
 */

const eagerRelationShip = Symbol('eagerRelationship')

@Injectable
class ProgressService {
  constructor() {
    this.clientAttributes = ['id', 'data', 'createdAt', 'updatedAt']
    this[eagerRelationShip] = {
      create: {
        exam: true
      },
      getOne: {
        exam: {
          $modify: ['clientAttributes'],
          model: {
            $modify: ['clientAttributes']
          }
        }
      },
      updateOne: {
        exam: true
      }
    }
    this.aws = new AmazonWebServices()
    this.config = new ConfigService().provider
    this.context = new NotificationContext()
  }

  /**
   * @param {Source} progress
   * @returns {Promise<Progress>}
   */
  @Bind
  create(progress) {
    const relation = this[eagerRelationShip].create

    return Progress.query().insertAndFetch(progress).withGraphFetched(relation)
  }

  /**
   * @param {Source} progress
   * @returns {Promise<Progress>}
   */
  @Bind
  getOne(progress) {
    const relation = this[eagerRelationShip].getOne

    return Progress.query()
      .findOne(progress)
      .withGraphFetched(relation)
      .select(this.clientAttributes)
  }

  /**
   * @param {Source} progress
   * @returns {Promise<Progress>}
   */
  @Bind
  updateOne(progress) {
    const relation = this[eagerRelationShip].updateOne

    return Progress.query()
      .patchAndFetchById(progress.id, progress)
      .withGraphFetched(relation)
  }

  @Bind
  async createFeedbackTransaction({ applySubscriptionDiscount, ref }) {
    const state = {
      requiresPayment: false,
      bucket: process.env.AWS_BUCKET,
      upload: false,
      charges: null
    }

    const SQL = Progress.knex()

    /**
     * @description
     * Finds the charge to get consumed.
     */
    ref.category.name.includes(Categories.Speaking) &&
      Object.assign(state, { charges: 'speakings' })

    ref.category.name.includes(Categories.Writing) &&
      Object.assign(state, { charges: 'writings' })

    const feedback = await SQL.transaction(async T => {
      try {
        /**
         * @description
         * If Discount applys, we should discount from the most recent package.
         */
        if (applySubscriptionDiscount) {
          const pack = await Package.query(T)
            .withGraphJoined('plan')
            .findOne(ref.package)
            .where(state.charges, '>', 0)
            .andWhere({ isActive: true })
            .andWhere('plan.modelId', ref.model.id)

          /**
           * @description
           * Patching package and discounting 1 speaking or 1 writing.
           */
          if (pack) {
            const charge = await Package.query(T).patchAndFetchById(pack.id, {
              [state.charges]: pack[state.charges] - 1
            })

            /**
             * @description
             * Showing the current speakings, writings
             */
            this.logger.info(`Speakings update: ${charge.speakings}`)

            this.logger.info(`Writings update: ${charge.writings}`)
          } else {
            state.requiresPayment = true
            /**
             * @description
             * Should notified that the package doesn't not contain any information about payments.
             */
            throw new Error('Payment')
          }
        }

        /**
         * @description
         * Is Speaking logic.
         */
        if (ref.category.name === Categories.Speaking) {
          /**
           * @description
           * Chaining all promises to reduce complexity in perfomance.
           * @type {import ('aws-sdk').S3.PutObjectOutput []}
           */
          const requests = ref.recordings.map(recording =>
            this.aws.upload({
              Body: recording.buffer,
              Key: `speakings/${recording.originalname}`,
              Bucket: state.bucket
            })
          )

          /**
           * @description
           * Making a Graph of results, this will be stored in cloudstorage.
           */
          const uploads = (await Promise.all(requests)).map(recording => {
            return {
              bucket: recording.Bucket,
              ETag: recording.ETag,
              key: recording.key.replace('speakings/', ''),
              location: recording.Location,
              userId: ref.user.id
            }
          })

          /**
           * @description
           * This is because, we can't make a transaction inside AWS SDK.
           * So this will be used in catch exception.
           */
          state.upload = true

          /**
           * @description
           * CloudStorageRef saving information about these uploads.
           */
          const storage = await CloudStorage.query(T).insertGraphAndFetch(
            uploads
          )

          const keys = ref.progress.data[ref.category.name]

          const ids = storage.map(({ id }) => id)

          keys.completed = applySubscriptionDiscount || false

          keys.cloudStorageRef.push(ids)

          keys.lastIndex = ref.lastIndex

          const { exam } = await Progress.query(T)
            .patchAndFetchById(ref.progress.id, {
              data: ref.progress.data
            })
            .where({ id: ref.progress.id })
            .withGraphFetched({ exam: true })

          if (applySubscriptionDiscount) {
            const evaluation = await Evaluation.query(T).insertAndFetch({
              examId: exam.id,
              categoryId: ref.category.id,
              data: {
                cloudStorageRef: keys.cloudStorageRef
              },
              STATUS: STATUS.PENDING,
              userId: ref.user.id,
              refVersion: exam.version
            })

            const type = await this.context.getContextIdentifier(
              {
                name: EvaluationCompleted
              },
              T
            )

            const stream = new Socket()

            /**
             * @description
             * Creating notification
             */
            const notification = await Notification.query(T)
              .insertAndFetch({
                message: 'Default Evalaution Notification',
                read: false,
                userId: ref.user.id,
                type: type.id
              })
              .withGraphFetched({ notificationType: true })

            /**
             * @description
             * Sending to socket notification
             */
            stream.socket.to(ref.user.email).emit(NOTIFICATION, notification)

            return {
              evaluation,
              feedback: true
            }
          }

          return true
        }

        if (ref.category.name === Categories.Writing) {
          const keys = ref.progress.data[ref.category.name]

          keys.completed = applySubscriptionDiscount || false
          keys.feedback.push(ref.feedback)
          keys.lastIndex = ref.lastIndex

          /**
           * Updating progress
           */
          const { exam } = await Progress.query(T)
            .patchAndFetchById(ref.progress.id, {
              data: ref.progress.data
            })
            .where({ id: ref.progress.id })
            .withGraphFetched({ exam: true })

          /**
           * ApplySubscriptionsDiscount means that a teacher should take a evaluation of this.
           */
          if (applySubscriptionDiscount) {
            /**
             * @description
             * Creating an evaluation
             */
            const evaluation = await Evaluation.query(T).insertAndFetch({
              examId: exam.id,
              categoryId: ref.category.id,
              data: {
                feedback: keys.feedback
              },
              STATUS: STATUS.PENDING,
              userId: ref.user.id,
              refVersion: exam.version
            })
            const stream = new Socket()

            const type = await this.context.getContextIdentifier(
              {
                name: Feedback
              },
              T
            )

            const notification = await Notification.query(T)
              .insertAndFetch({
                message: 'Default Feedback Notification',
                read: false,
                userId: ref.user.id,
                type: type.id
              })
              .withGraphFetched({ notificationType: true })

            stream.socket.to(ref.user.email).emit(NOTIFICATION, notification)

            return {
              evaluation,
              feedback: true
            }
          }

          return true
        }
      } catch (err) {
        this.logger.error('Transaction Error', err)
        /**
         * @description
         * If breakpoint is true, we should rollback all files.
         */
        if (state.upload) {
          const stored = ref.recordings.map(recording => ({
            Key: recording.originalname
          }))

          /**
           * Deleting the file that has been previously commited.
           * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
           */
          await this.aws.deleteObjects({
            Bucket: state.bucket,
            Delete: {
              Objects: stored
            }
          })
        }

        return {
          transactionError: true,
          requiresPayment: state.requiresPayment
        }
      }
    })

    return feedback
  }

  @Bind
  async updateScoreWithProgress({ context, data, score }) {
    const stream = new Socket()

    const SQL = Progress.knex()

    const transaction = await SQL.transaction(async T => {
      try {
        this.logger.info('context', { value: context })

        if (context) {
          const progress = await Progress.query(T)
            .updateAndFetchById(data.id, data)
            .select(this.clientAttributes)

          const stats = await Stats.query(T)
            .insertAndFetch({
              ...score.ref,
              ...score.user
            })
            .withGraphFetched({ category: true })

          const type = await this.context.getContextIdentifier(
            {
              name: Feedback
            },
            T
          )

          const notification = await Notification.query(T)
            .insertAndFetch({
              message: 'Default Feedback Notification',
              read: false,
              userId: score.user.userId,
              type: type.id
            })
            .withGraphFetched({ notificationType: true })

          stream.socket.to(score.email).emit(NOTIFICATION, notification)

          return {
            notification,
            progress,
            stats
          }
        }

        const progress = await Progress.query(T)
          .updateAndFetchById(data.id, data)
          .select(this.clientAttributes)

        return {
          progress,
          stats: null
        }
      } catch (err) {
        this.logger.error('transactionDetails', err)

        return {
          transactionError: true
        }
      }
    })

    return transaction
  }
}

export { ProgressService }
