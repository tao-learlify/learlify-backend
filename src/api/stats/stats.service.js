import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import Stats from './stats.model'
import Progress from 'api/progress/progress.model'

import { Models } from 'metadata/models'

/**
 * @typedef {Object} Stat
 * @property {number} categoryId
 * @property {number} userId
 * @property {{}} trx
 */

/**
 * @typedef {Object} StatModel
 * @property {number} id
 * @property {number} userId
 * @property {'C1' | 'B2' | 'B1' | 'A2' | 'A1'} marking
 * @property {number} points
 * @property {number} examId
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

export class StatsService {
  constructor() {
    this.relationShip = {
      getAll: {
        exam: {
          model: {
            $modify: ['clientAttributes']
          },
          $modify: ['stats']
        }
      },
      getAllWithExam: '[category(name), exams(name) as exam]'
    }
    this.limitStatus = 3
    this.logger = Logger.Service
    this.clientAttributes = [
      'id',
      'bandScore',
      'points',
      'marking',
      'createdAt'
    ]
  }
  /**
   *
   * @param {Stat} stats
   * @returns {Promise<Stat.<StatModel>>}
   */
  @Bind
  create({ trx, ...stats }) {
    return Stats.query(trx).insertAndFetch({ ...stats })
  }

  /**
   * @param {Stat} stats
   * @returns {Promise<Stat.<StatModel []>}
   */
  @Bind
  getAll(stats, { model }) {
    switch (model) {
      case Models.APTIS:
        return Stats.query()
          .whereNotNull('examId')
          .andWhere(stats)
          .limit(this.limitStatus)
          .orderBy('createdAt', 'DESC')
          .withGraphFetched({ category: true })

      case Models.IELTS:
        return Stats.query()
          .whereNotNull('examId')
          .andWhere(stats)
          .andWhereNot({ bandScore: 0 })
          .orderBy('createdAt', 'DESC')
          .withGraphFetched({ category: true })
    }
  }

  @Bind
  async createStatsAndRestartProgress(data) {
    try {
      const transaction = await Stats.knex().transaction(async trx => {
        try {
          const stats = await Stats.query(trx).insertAndFetch({
            ...data.stats
          })

          this.logger.info('Stats', stats)

          const progress = await Progress.query(trx).patchAndFetchById(
            data.progress.id,
            {
              ...data.progress
            }
          )

          this.logger.info('Progress', progress)

          return {
            stats,
            progress
          }
        } catch (err) {
          return {
            transactionError: true,
            details: err
          }
        }
      })

      return transaction
    } catch (err) {
      return {
        transactionError: true,
        details: err
      }
    }
  }

  async getOne({ userId, examId, categoryId }) {
    const limit = 1

    const [stat] = await Stats.query()
      .where({ userId, examId, categoryId })
      .limit(limit)
      .withGraphFetched({
        exam: { model: true },
        category: true,
        evaluation: true
      })
      .orderBy('createdAt', 'DESC')

    return stat
  }
}
