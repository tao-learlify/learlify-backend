/**
 * Create progress table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function(knex) {
  return knex.schema.createTable('progress', table => {
    table.increments('id').primary()
    table
      .integer('examId')
      .unsigned()
      .notNullable()
    table
      .foreign('examId')
      .references('exams.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
    table
      .integer('userId')
      .unsigned()
      .notNullable()
    table.foreign('userId')
      .references('users.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
    table.json('examJSON')
    table.boolean('completed')
      .defaultTo(false)
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

/**
 * Drop progress table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('progress')
}
