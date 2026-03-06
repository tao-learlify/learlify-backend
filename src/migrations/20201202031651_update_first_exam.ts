import type { Knex } from 'knex'

exports.up = async function (knex: Knex): Promise<void> {
  try {
    await knex('exams')
      .update({
        requiresPayment: false
      })
      .where({ id: 1 })

    await knex('exams')
      .update({
        requiresPayment: false
      })
      .where({ id: 11 })
  } catch (err) {
    globalThis.console.error(err)
  }
}

exports.down = async function (knex: Knex): Promise<void> {
  try {
    await knex('exams')
    .update({
      requiresPayment: true
    })
    .where({ id: 1 })

  await knex('exams')
    .update({
      requiresPayment: true
    })
    .where({ id: 11 })
  } catch (err) {
    globalThis.console.error(err)
  }
}
