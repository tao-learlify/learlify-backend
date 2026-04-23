import type { Knex } from 'knex'

exports.up = function (knex: Knex): unknown {
  return knex.schema.createTable('push_subscriptions', (table) => {
    table.increments('id').primary()
    table.integer('userId').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
    table.text('endpoint').notNullable()
    table.string('p256dh', 512).notNullable()
    table.string('auth', 256).notNullable()
    table.timestamps(true, true)
    table.unique(['userId', 'endpoint'])
  })
}

exports.down = function (knex: Knex): unknown {
  return knex.schema.dropTableIfExists('push_subscriptions')
}
