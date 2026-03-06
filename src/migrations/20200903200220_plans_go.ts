import type { Knex } from 'knex'

exports.up = async function (knex: Knex): Promise<void> {
  try {
    await knex('plans').update({ price: 900 }).where({ name: 'Go' })
  } catch (err) {
    globalThis.console.error(err)
  }
}

exports.down = async function (knex: Knex): Promise<void> {
  try {
    await knex('plans').update({ price: 500 }).where({ name: 'Go' })
  } catch (err) {
    globalThis.console.log(err)
  }
}
