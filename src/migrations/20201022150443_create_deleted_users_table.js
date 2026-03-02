/**
 * Create deleted_users table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function (knex) {
  return knex.schema.createTable('deleted_users', table => {
    table.increments('id').primary()
    table.integer('userId').notNullable().unique()
    table.string('email').notNullable().unique()
    table.string('firstName').notNullable()
    table.string('lastName').notNullable()
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

/**
 * Drop deleted_users table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('deleted_users')
}
