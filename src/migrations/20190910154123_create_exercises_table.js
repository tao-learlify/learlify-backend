/**
 * Create exercises table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function(knex) {
  return knex.schema.createTable('exercises', table => {
    table.increments('id').primary()
    table.string('description', 1000)
    table.string('label', 1000)
    table.string('subtitle', 1000)
    table.integer('recordingTime')
    table.integer('strictOrder')
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
      .integer('categoryId')
      .unsigned()
      .notNullable()
    table.foreign('categoryId').references('category.id')
  })
}

/**
 * Drop exercises table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('exercises')
}
