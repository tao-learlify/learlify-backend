import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { convert } from 'exchange-rates-api'
import Plan from './plans.model'

import taxes from 'core/plans.json'
import currencies from 'core/currencies.json'

import { ModelsService } from 'api/models/models.service'
import type { GetAllParams, PlanSource } from './plans.types'

class PlansService {
  clientAttributes: string[]
  private relation: Record<string, boolean>
  models: ModelsService
  logger: typeof Logger.Service

  constructor() {
    this.clientAttributes = [
      'id',
      'name',
      'classes',
      'currency',
      'writing',
      'speaking',
      'price',
      'createdAt',
      'updatedAt',
      'modelId',
      'pandaUrl'
    ]
    this.relation = {
      model: true,
      access: true
    }
    this.models = new ModelsService()
    this.logger = Logger.Service
  }

  @Bind
  async getAll({ names, currency, available = true, ...options }: GetAllParams) {
    const filters = {
      ...options,
      available
    }

    if (names) {
      if (names.length === 0) return []

      const plans = await Plan.query()
        .whereIn('name', names)
        .where(filters)
        .select(this.clientAttributes)
        .withGraphFetched(this.relation)

      const isIELTS = plans.find(({ model }) => (model as unknown as Record<string, unknown>)?.name === 'IELTS')

      if (currency) {
        if ((currencies as string[]).includes(currency) === false) {
          currency = 'EUR'

          const conversion = plans.map(plan => {
            return Object.assign(plan, {
              price: isIELTS ? (taxes as Record<string, Record<string, number>>)[currency as string][plan.name as string] : plan.price
            })
          })

          for (const plan of conversion) {
            const taxe = await convert(
              (taxes as Record<string, Record<string, number>>)[currency as string][plan.name as string] || 0,
              currency as string,
              'USD'
            )

            this.logger.info('taxe', { taxe })

            Object.assign(plan, {
              taxe: parseInt(taxe as unknown as string)
            })
          }

          return conversion
        }
      }

      return plans
    }

    return Plan.query()
      .where(filters)
      .withGraphJoined(this.relation)
  }

  getOne(plan: PlanSource | null, id?: number) {
    if (plan === null) {
      return Plan.query().findById(id as number)
    }

    return Plan.query().findOne(plan)
  }

  updateOne({ id, ...advance }: { id: number; [key: string]: unknown }) {
    return Plan.query().patchAndFetchById(id, advance)
  }

  create(plan: Record<string, unknown>) {
    return Plan.query().insertAndFetch(plan)
  }

  remove(id: number) {
    return Plan.query().deleteById(id)
  }
}

export { PlansService }
