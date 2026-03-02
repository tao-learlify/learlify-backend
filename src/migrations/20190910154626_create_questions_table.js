/**
 * Create questions table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function(knex) {
  return knex.schema.createTable('questions', table => {
    table.increments('id').primary()
    table.string('title', 1000)
    table.integer('orderAs')
    table.string('recordingUrl')
    table.json('imageUrl')
    table
      .integer('exerciseId')
      .unsigned()
      .notNullable()
    table
      .foreign('exerciseId')
      .references('exercises.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}

/**
 * Drop questions table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('questions')
}
