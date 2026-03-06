import type { Knex } from 'knex'

import { Plan } from '../metadata/plans'

const tableName = 'plans'
const ieltsCoursePlan = 'Curso IELTS'

const priceUpdates = [
  { name: Plan.SILVER, price: 2400 },
  { name: Plan.GOLD, price: 2900 },
  { name: Plan.PLATINUM, price: 3900 },
  { name: Plan.GO, price: 1500 },
  { name: Plan.APTIS, price: 2000 },
  { name: ieltsCoursePlan, price: 2000 },
  { name: Plan.RUBY, price: 4700 }
]

const priceRollback = [
  { name: Plan.SILVER, price: 1200 },
  { name: Plan.GOLD, price: 1500 },
  { name: Plan.PLATINUM, price: 2100 },
  { name: Plan.GO, price: 900 },
  { name: Plan.APTIS, price: 1499 },
  { name: ieltsCoursePlan, price: 1999 },
  { name: Plan.RUBY, price: 3900 }
]

const disabledPlans = [
  Plan.DIAMOND,
  Plan.BLUE,
  Plan.GREEN,
  Plan.MASTER,
  Plan.GRANDMASTER
]

async function updatePlanByName(
  db: Knex | Knex.Transaction,
  name: string,
  changes: Record<string, unknown>
): Promise<void> {
  await db(tableName)
    .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
    .update(changes)
}

exports.up = async function (knex: Knex): Promise<void> {
  await knex.transaction(async trx => {
    for (const plan of priceUpdates) {
      await updatePlanByName(trx, plan.name, {
        available: true,
        price: plan.price
      })
    }

    for (const name of disabledPlans) {
      await updatePlanByName(trx, name, {
        available: false
      })
    }
  })
}

exports.down = async function (knex: Knex): Promise<void> {
  await knex.transaction(async trx => {
    for (const plan of priceRollback) {
      await updatePlanByName(trx, plan.name, {
        available: true,
        price: plan.price
      })
    }

    for (const name of disabledPlans) {
      await updatePlanByName(trx, name, {
        available: true
      })
    }
  })
}
