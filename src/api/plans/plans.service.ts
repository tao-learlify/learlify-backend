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

  async getCatalog({ modelId }: { modelId?: number }) {
    const query = Plan.query().where({ available: true })

    if (modelId) {
      query.where({ modelId })
    }

    const plans = await query.select([
      'id', 'name', 'description', 'price', 'writing', 'speaking', 'feature', 'modelId'
    ])

    return (plans as unknown as Array<Record<string, unknown>>).map((plan, index) => {
      const price = Number(plan.price) || 0
      const yearlyPrice = Math.round(price * 10) // 2 months free

      return {
        id: plan.id,
        code: String(plan.name).toLowerCase().replace(/\s+/g, '_'),
        name: plan.name,
        description: plan.description || null,
        includes_course: plan.feature === 'COURSES',
        included_exams: null,
        included_speaking_reviews: Number(plan.speaking) || 0,
        included_writing_reviews: Number(plan.writing) || 0,
        sort_order: index,
        prices: [
          {
            id: (plan.id as number) * 10 + 1,
            plan_id: plan.id,
            billing_cycle: 'monthly',
            currency: 'EUR',
            base_price: price,
            discount_percentage: 0,
            final_price: price,
            active: true
          },
          {
            id: (plan.id as number) * 10 + 2,
            plan_id: plan.id,
            billing_cycle: 'yearly',
            currency: 'EUR',
            base_price: yearlyPrice,
            discount_percentage: 17,
            final_price: Math.round(yearlyPrice * 0.83),
            active: true
          }
        ]
      }
    })
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
