import LatestEvaluation from './latestEvaluations.model'
import STATUS from 'api/evaluations/evaluations.status'
import { ConfigService } from 'api/config/config.service'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'

const relationShip = Symbol('relationShip')

export class LatestEvaluationsService {
  constructor() {
    this[relationShip] = {
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

  /**
   * @param {Source} evaluation
   * @returns {Promise<Evaluation []>}
   */
  @Bind
  getAll({ page, limit, ...evaluation }) {
    const { getAll } = this[relationShip]

    return LatestEvaluation.query()
      .withGraphFetched(getAll.relationShip)
      .page(page - 1, limit || this.configService.provider.PAGINATION_LIMIT)
      .where(evaluation)
      .andWhere({ status: STATUS.EVALUATED })
      .orderBy('createdAt', 'desc')
  }

  /**
   * @param {Source} evaluation
   * @returns {Promise<Evaluation>}
   */
  @Bind
  getOne(id) {
    const { getAll } = this[relationShip]

    return LatestEvaluation.query()
      .findById(id)
      .withGraphFetched(getAll.relationShip)
  }

  async count(options) {
    const { total } = await LatestEvaluation.query()
      .count('* as total')
      .where(options)
      .first()
    return total
  }
}
