const STATUS = require('../api/stats/stats.status')

exports.up = function (knex) {
  return knex.schema.dropTableIfExists('statistics')
}

exports.down = function (knex) {
  return knex.schema.createTable('statistics', table => {
    table
      .increments('id')
      .primary()
    table
      .integer('categoryId')
      .unsigned()
      .notNullable()
    table
      .foreign('categoryId')
      .references('category.id')
    table
      .enu('marking', STATUS.asArray())
      .notNullable()
    table
      .integer('points')
      .unsigned()
      .notNullable()
      .defaultTo(0)
    table
      .timestamp('updatedAt')
      .defaultTo(knex.fn.now())
    table
      .timestamp('createdAt')
      .defaultTo(knex.fn.now())
  })
}
