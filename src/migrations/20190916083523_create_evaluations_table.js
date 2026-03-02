const STATUS = require('../api/evaluations/evaluations.status')


exports.up = function(knex) {
  return knex.schema.createTable('evaluations', table => {
    table.increments('id').primary()
    table
    .integer('userId')
    .unsigned()
    .notNullable()
    table
    .foreign('userId')
    .references('users.id')
    .onUpdate('CASCADE')
    .onDelete('CASCADE')
    table.integer('teacherId').unsigned()
    table.foreign('teacherId').references('users.id')
    table.integer('progressId').unsigned()
    table.foreign('progressId').references('progress.id')
    table.integer('categoryId').unsigned()
    table.foreign('categoryId').references('category.id')
    table.text('comments')
    table.enu('status', STATUS.asArray()).notNullable()
    table.json('resultsJSON')
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('evaluations')
};
