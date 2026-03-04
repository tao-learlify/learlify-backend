import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import Stats from './stats.model'
import Progress from 'api/progress/progress.model'
import { Models } from 'metadata/models'
import type { StatCreateParams, StatsAndProgressData } from './stats.types'

export class StatsService {
  relationShip: {
    getAll: { exam: { model: { $modify: string[] }; $modify: string[] } }
    getAllWithExam: string
  }
  limitStatus: number
  logger: typeof Logger.Service
  clientAttributes: string[]

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

  @Bind
  create({ trx, ...stats }: StatCreateParams) {
    return Stats.query(trx).insertAndFetch({ ...stats })
  }

  @Bind
  getAll(stats: Record<string, unknown>, { model }: { model: string }) {
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
  async createStatsAndRestartProgress(data: StatsAndProgressData) {
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

  async getOne({ userId, examId, categoryId }: { userId: number; examId: number; categoryId: number }) {
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
