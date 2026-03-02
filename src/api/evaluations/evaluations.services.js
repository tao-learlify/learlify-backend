import Evaluation from './evaluations.model'
import STATUS from './evaluations.status'
import { ConfigService } from 'api/config/config.service'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { Socket } from 'modules'
import Notification from 'api/notifications/notifications.model'
import { NotificationContext } from 'api/notifications/notification.context'

import { NOTIFICATION } from 'gateways/events'
import { EvaluationCompleted } from 'metadata/notifications'
import Stats from 'api/stats/stats.model'

/**
 * @typedef {Object} Source
 * @property {boolean} count
 * @property {number} id
 * @property {number} examId
 * @property {number} progressId
 * @property {number} teacherId
 * @property {{}} options
 */

const relationShip = Symbol('relationShip')
const clientAttributes = Symbol('clientAttributes')

export class EvaluationsService {
  constructor() {
    this[clientAttributes] = {
      evaluation: ['comments', 'createdAt', 'data', 'status'],
      onlyName: ['firstName', 'lastName', 'id'],
      exam: ['data']
    }
    this[relationShip] = {
      create: {
        relationShip: {
          user: {
            $modify: 'withName'
          }
        }
      },
      getOne: {
        relationShip:
          '[user(evaluation), teacher(evaluation), category(name), exam.[model], stats]'
      },
      getAll: {
        relationShip: {
          user: {
            $modify: 'withName'
          },
          teacher: {
            $modify: 'withName'
          },
          category: true,
          exam: {
            $modify: 'clientAttributes',
            model: true
          }
        }
      },
      updateOne: {
        relationShip: {
          user: {
            $modify: 'withName'
          },
          teacher: {
            $modify: 'withName'
          },
          category: true
        }
      }
    }
    this.configService = new ConfigService()
    this.context = new NotificationContext()
    this.logger = Logger.Service
  }

  /**
   * @param {Source} evaluation
   * @returns {Promise<Evaluation []>}
   */
  @Bind
  getAll({ page, paginationLimit, userId, modelId, ...evaluation }) {
    const { getAll } = this[relationShip]

    
    if (userId) {
      return Evaluation.query()
        .withGraphJoined(getAll.relationShip)
        .where({ userId })
        .whereNotNull('data')
        .where('exam.examModelId', modelId)
        .page(
          page - 1,
          paginationLimit || this.configService.provider.PAGINATION_LIMIT
        )
        .orderBy('createdAt', 'desc')
    }

    if (evaluation && evaluation.count) {
      return Evaluation.query()
        .count('status as count')
        .where(evaluation.options)
    }

    if (evaluation) {
      return evaluation.teacherId
        ? Evaluation.query()
            .andWhere(evaluation)
            .page(page - 1, this.configService.provider.PAGINATION_LIMIT)
            .withGraphFetched(getAll.relationShip)
            .orderBy('createdAt', 'desc')
        : Evaluation.query()
            .where(evaluation)
            .andWhereNot({ status: STATUS.EVALUATED })
            .page(page - 1, this.configService.provider.PAGINATION_LIMIT)
            .withGraphFetched(getAll.relationShip)
            .orderBy('createdAt', 'desc')
    }

    return Evaluation.query()
      .whereNotNull('data')
      .andWhereNot({ status: STATUS.EVALUATED })
      .page(page - 1, this.configService.provider.PAGINATION_LIMIT)
      .withGraphFetched(getAll.relationShip)
      .orderBy('createdAt', 'desc')
  }

  /**
   * @description Perform a lightweight query for extract specific data.
   * @param {number | string} id
   * @param {string []?} rows
   * @returns {Promise<Evaluation[], Evaluation}
   */
  getTeacherEvaluation(id, rows = 'id') {
    return Evaluation.query().select(rows).where({ id })
  }

  /**
   * @param {Source} evaluation
   * @returns {Promise<Evaluation>}
   */
  @Bind
  async findOne({ early, ...evaluation }) {
    const { getOne } = this[relationShip]

    if (early) {
      const [value] = await Evaluation.query()
        .where(evaluation)
        .limit(1)
        .orderBy('createdAt', 'DESC')
        .withGraphFetched({
          exam: true,
          category: true,
        })

      return value
    }

    const formatted = await Evaluation.query()
      .findById(evaluation.id)
      .withGraphJoined(getOne.relationShip)

    return Object.assign(formatted, evaluation)
  }

  /**
   * @param {Source} evaluation
   * @returns {Promise<Evaluation>}
   */
  @Bind
  update(evaluation) {
    const { updateOne } = this[relationShip]

    return Evaluation.query()
      .patchAndFetchById(evaluation.id, evaluation)
      .withGraphFetched(updateOne.relationShip)
  }

  /**
   * @description
   * Returns an evaluation for his creation.
   * @param {{}} evaluation
   * @returns {Promise<Evaluation>}
   */
  @Bind
  createEvaluation(evaluation) {
    const { create } = this[relationShip]

    return Evaluation.query()
      .insert(evaluation)
      .withGraphFetched(create.relationShip)
  }

  @Bind
  async patchAndCreateResults(evaluation, forStats) {
    const stream = new Socket()

    const { updateOne } = this[relationShip]

    const returnValue = await Evaluation.knex().transaction(async T => {
      try {
        const update = await Evaluation.query(T)
          .patchAndFetchById(evaluation.id, {
            ...evaluation,
            status: STATUS.EVALUATED
          })
          .withGraphFetched(updateOne.relationShip)

        /**
         * @description
         * If stats are being created.
         */
        if (forStats) {
          const stats = await Stats.query(T).insertAndFetch({
            ...forStats
          })

          this.logger.debug('stats', stats)
        }

        const type = await this.context.getContextIdentifier(
          {
            name: EvaluationCompleted
          },
          T
        )

        const notification = await Notification.query(T).insertAndFetch({
          message: 'Default Evaluation Notification',
          read: false,
          userId: update.user.id,
          type: type.id
        })

        stream.socket.to(update.user.email).emit(NOTIFICATION, notification)

        this.logger.debug('update', update)

        return update
      } catch (err) {
        this.logger.error('patchAndCreeateResults', err)

        return {
          details: err,
          transactionError: true
        }
      }
    })

    return returnValue
  }
}
