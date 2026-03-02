const STATUS = require('../api/stats/stats.status')

exports.up = function(knex) {
  return knex.schema.createTable('results', table => {
    table.increments('id').primary()
    table.integer('evaluationId').unsigned()
    table.foreign('evaluationId').references('evaluations.id')
    table.boolean('completed').notNull().defaultTo(false)
    table
    .integer('userId')
    .unsigned()
    .notNullable()
    table
    .foreign('userId')
    .references('users.id')
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    table
    .enu('marking', STATUS.asArray())
    .notNullable()
    table
    .integer('points')
    .notNullable()
    .defaultTo(0)
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('results')
};
