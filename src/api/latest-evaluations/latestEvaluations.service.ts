import LatestEvaluation from './latestEvaluations.model'
import STATUS from 'api/evaluations/evaluations.status'
import { ConfigService } from 'api/config/config.service'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import type { LatestEvaluationGetAllParams, LatestEvaluationCountParams } from './latestEvaluations.types'

export class LatestEvaluationsService {
  #relation: {
    getOne: { relationShip: string }
    getAll: { relationShip: Record<string, unknown> }
  }
  private configService: ConfigService
  private logger: typeof Logger.Service

  constructor() {
    this.#relation = {
      getOne: {
        relationShip: '[user(withName), teacher(withName), category, results]'
      },
      getAll: {
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
    this.logger = Logger.Service
  }

  @Bind
  getAll({ page, limit, ...evaluation }: LatestEvaluationGetAllParams) {
    const { getAll } = this.#relation

    return LatestEvaluation.query()
      .withGraphFetched(getAll.relationShip)
      .page(page - 1, limit || (this.configService as unknown as Record<string, Record<string, unknown>>).provider.PAGINATION_LIMIT as number)
      .where(evaluation)
      .andWhere({ status: STATUS.EVALUATED })
      .orderBy('createdAt', 'desc')
  }

  @Bind
  getOne(id: number) {
    const { getAll } = this.#relation

    return LatestEvaluation.query()
      .findById(id)
      .withGraphFetched(getAll.relationShip)
  }

  async count(options: LatestEvaluationCountParams): Promise<number> {
    const { total } = await LatestEvaluation.query()
      .count('* as total')
      .where(options)
      .first() as unknown as { total: number }
    return total
  }
}
