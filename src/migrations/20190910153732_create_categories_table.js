/**
 * Create categories table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function(knex) {
  return knex.schema.createTable('category', table => {
    table.increments('id').primary()
    table.string('name')
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

/**
 * Drop categories table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('category')
}
