import type { Knex } from 'knex'

const tableName = 'plans'

exports.up = async function (knex: Knex): Promise<void> {
  await knex(tableName).insert({
    classes: 1,
    currency: 'EUR',
    name: 'Blue',
    price: 1300,
    speaking: 0,
    writing: 0
  })

  await knex(tableName).insert({
    classes: 4,
    currency: 'EUR',
    name: 'Green',
    price: 4900,
    speaking: 0,
    writing: 0
  })

  await knex(tableName).insert({
    classes: 0,
    currency: 'EUR',
    name: 'Ruby',
    price: 3900,
    speaking: 10,
    writing: 10
  })

  await knex(tableName).insert({
    classes: 1,
    currency: 'EUR',
    name: 'Diamond',
    price: 4900,
    speaking: 5,
    writing: 5
  })

  await knex(tableName).insert({
    classes: 4,
    currency: 'EUR',
    name: 'Master',
    price: 7900,
    speaking: 5,
    writing: 5
  })

  await knex(tableName).insert({
    classes: 4,
    currency: 'EUR',
    name: 'Grand Master',
    price: 9700,
    speaking: 10,
    writing: 10
  })
}

exports.down = async function (knex: Knex): Promise<void> {
  await knex(tableName)
    .del()
    .where({ name: 'Blue' })
  await knex(tableName)
    .del()
    .where({ name: 'Green' })
  await knex(tableName)
    .del()
    .where({ name: 'Ruby' })
  await knex(tableName)
    .del()
    .where({ name: 'Blue' })
  await knex(tableName)
    .del()
    .where({ name: 'Diamond' })
  await knex(tableName)
    .del()
    .where({ name: 'Master' })
  await knex(tableName)
    .del()
    .where({ name: 'Grand Master' })
}
