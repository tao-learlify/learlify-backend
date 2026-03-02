/**
 * Create answers table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function(knex) {
  return knex.schema.createTable('answers', table => {
    table.increments('id').primary()
    table.string('title')
    table.boolean('isCorrect').defaultTo(false)
    table
      .integer('questionId')
      .unsigned()
      .notNullable()
    table
      .foreign('questionId')
      .references('questions.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}

/**
 * Drop answers table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('answers')
}
