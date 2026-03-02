/**
 * Create plans table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function(knex) {
  return knex.schema.createTable('plans', table => {
    table.increments('id').primary()
    table.string('name')
    table.string('description')
    table.string('currency').notNullable()
    table.integer('writing')
    table.integer('speaking')
    table.integer('price').notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

/**
 * Drop plans table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('plans')
}
