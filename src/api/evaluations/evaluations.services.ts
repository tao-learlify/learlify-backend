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
import type { EvaluationGetAllParams, EvaluationFindOneParams, EvaluationUpdateInput, PatchAndCreateResultsInput } from './evaluations.types'

export class EvaluationsService {
  #clientAttributes: {
    evaluation: string[]
    onlyName: string[]
    exam: string[]
  }

  #relation: {
    create: { relationShip: Record<string, unknown> }
    getOne: { relationShip: string }
    getAll: { relationShip: Record<string, unknown> }
    updateOne: { relationShip: Record<string, unknown> }
  }

  private configService: ConfigService
  private context: NotificationContext
  private logger: typeof Logger.Service

  constructor() {
    this.#clientAttributes = {
      evaluation: ['comments', 'createdAt', 'data', 'status'],
      onlyName: ['firstName', 'lastName', 'id'],
      exam: ['data']
    }
    this.#relation = {
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

  @Bind
  getAll({ page, paginationLimit, userId, modelId, ...evaluation }: EvaluationGetAllParams) {
    const { getAll } = this.#relation

    
    if (userId) {
      return Evaluation.query()
        .withGraphJoined(getAll.relationShip)
        .where({ userId })
        .whereNotNull('data')
        .where('exam.examModelId' as unknown as string, modelId as number)
        .page(
          page - 1,
          paginationLimit || this.configService.provider.PAGINATION_LIMIT
        )
        .orderBy('createdAt', 'desc')
    }

    if (evaluation && evaluation.count) {
      return Evaluation.query()
        .count('status as count')
        .where(evaluation.options as Record<string, unknown>)
    }

    if (evaluation) {
      return evaluation.teacherId
        ? Evaluation.query()
            .andWhere(evaluation as Record<string, unknown>)
            .page(page - 1, this.configService.provider.PAGINATION_LIMIT)
            .withGraphFetched(getAll.relationShip)
            .orderBy('createdAt', 'desc')
        : Evaluation.query()
            .where(evaluation as Record<string, unknown>)
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

  getTeacherEvaluation(id: number | string, rows: string | string[] = 'id') {
    return Evaluation.query().select(rows).where({ id })
  }

  @Bind
  async findOne({ early, ...evaluation }: EvaluationFindOneParams) {
    const { getOne } = this.#relation

    if (early) {
      const [value] = await Evaluation.query()
        .where(evaluation as Record<string, unknown>)
        .limit(1)
        .orderBy('createdAt', 'DESC')
        .withGraphFetched({
          exam: true,
          category: true,
        })

      return value
    }

    const formatted = await Evaluation.query()
      .findById(evaluation.id as number)
      .withGraphJoined(getOne.relationShip)

    return Object.assign(formatted as unknown as Record<string, unknown>, evaluation)
  }

  @Bind
  update(evaluation: EvaluationUpdateInput) {
    const { updateOne } = this.#relation

    return Evaluation.query()
      .patchAndFetchById(evaluation.id, evaluation)
      .withGraphFetched(updateOne.relationShip)
  }

  @Bind
  createEvaluation(evaluation: Record<string, unknown>) {
    const { create } = this.#relation

    return Evaluation.query()
      .insert(evaluation as unknown as Partial<Evaluation>)
      .withGraphFetched(create.relationShip)
  }

  @Bind
  async patchAndCreateResults(evaluation: PatchAndCreateResultsInput, forStats?: Record<string, unknown>) {
    const stream = new Socket()

    const { updateOne } = this.#relation

    const returnValue = await Evaluation.knex().transaction(async T => {
      try {
        const update = await Evaluation.query(T)
          .patchAndFetchById(evaluation.id, {
            ...evaluation,
            status: STATUS.EVALUATED
          })
          .withGraphFetched(updateOne.relationShip)

        if (forStats) {
          const stats = await Stats.query(T).insertAndFetch({
            ...forStats
          } as unknown as Partial<typeof Stats.prototype>)

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
          userId: (update as unknown as Record<string, unknown>).user
            ? ((update as unknown as Record<string, unknown>).user as Record<string, unknown>).id
            : undefined,
          type: (type as unknown as Record<string, unknown>).id
        } as unknown as Partial<typeof Notification.prototype>)

        stream.socket.to(((update as unknown as Record<string, unknown>).user as Record<string, unknown>).email as string).emit(NOTIFICATION, notification)

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

const _service = new EvaluationsService()
export const getTeacherEvaluation = _service.getTeacherEvaluation.bind(_service)
