import type { Knex } from 'knex'

exports.up = async function (knex: Knex): Promise<void> {
  await knex('languages').insert({
    lang: 'Español',
    code: 'es-US'
  })

  await knex('languages').insert({
    lang: 'Inglés',
    code: 'en-GB'
  })
}

exports.down = async function (knex: Knex): Promise<void> {
  await knex('languages')
    .where({ code: 'es-US' })
    .del()

  await knex('languages')
    .where({ code: 'en-GB' })
    .del()
}
