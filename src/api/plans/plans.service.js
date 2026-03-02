import { Bind, Injectable } from 'decorators'

import { convert } from 'exchange-rates-api'
import Plan from './plans.model'

import taxes from 'core/plans.json'
import currencies from 'core/currencies.json'

import { ModelsService } from 'api/models/models.service'

/**
 * @typedef {Object} Source
 * @property {string} name
 * @property {number} id
 * @property {boolean} isActive
 */

@Injectable
class PlansService {
  #relation

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
    this.#relation = {
      model: true,
      access: true
    }
    this.models = new ModelsService()
  }

  @Bind
  async getAll({ names, currency, ...options }) {
    if (names) {
      if (names.length === 0) return []

      const plans = await Plan.query()
        .whereIn('name', names)
        .andWhere(function () {
          this.where(options)
        })
        .select(this.clientAttributes)
        .withGraphFetched(this.#relation)

      const isIELTS = plans.find(({ model }) => model.name === 'IELTS')

      if (currency) {
        if (currencies.includes(currency) === false) {
          currency = 'EUR'

          const conversion = plans.map(plan => {
            return Object.assign(plan, {
              price: isIELTS ? taxes[currency][plan.name] : plan.price
            })
          })

          for (const plan of conversion) {
            const taxe = await convert(
              taxes[currency][plan.name] || 0,
              currency,
              'USD'
            )

            this.logger.info('taxe', { taxe })

            Object.assign(plan, {
              taxe: parseInt(taxe)
            })
          }

          return conversion
        }
      }

      return plans
    }

    return Plan.query()
      .where(options)
      .withGraphJoined(this.#relation)
  }

  /**
   * @param {Source} plan
   * @param {number?} id optional
   */
  getOne(plan, id) {
    if (plan === null) {
      return Plan.query().findById(id)
    }

    return Plan.query().findOne(plan)
  }

  updateOne({ id, ...advance }) {
    return Plan.query().patchAndFetchById(id, advance)
  }

  create(plan) {
    return Plan.query().insertAndFetch(plan)
  }

  remove(id) {
    return Plan.query().deleteById(id)
  }
}

export { PlansService }
