import type { Knex } from 'knex'

exports.up = function (knex: Knex): unknown {
  return knex.schema.createTable('packages', table => {
    table.increments('id').primary()
    table.integer('total')
    table.boolean('isActive').defaultTo(true)
    table.date('expirationDate').notNullable()
    table
      .string('stripeChargeId')
      .nullable()
      .defaultTo(null)
    table
      .boolean('isNotified')
      .notNullable()
      .defaultTo(false)
    table
      .integer('userId')
      .unsigned()
      .notNullable()
    table
      .integer('planId')
      .unsigned()
      .notNullable()
    table
      .integer('speakings')
      .unsigned()
      .notNullable()
    table
      .integer('writings')
      .unsigned()
      .notNullable()
    table
      .foreign('userId')
      .references('users.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
    table
      .foreign('planId')
      .references('plans.id')
      .onUpdate('CASCADE')
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

exports.down = function (knex: Knex): unknown {
  return knex.schema.dropTableIfExists('packages')
}
