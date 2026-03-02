/**
 * Create users table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary()
    table.string('email').notNullable()
    table.string('password').notNullable()
    table.string('firstName').notNullable()
    table.string('lastName').notNullable()
    table.string('token').defaultTo(null)
    table.boolean('isVerified').defaultTo(false)
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
    table
      .integer('roleId')
      .unsigned()
      .defaultTo(3)
      .notNullable()
    table.foreign('roleId').references('roles.id')
    table.string('imageUrl').defaultTo(null)
    table.string('googleId').defaultTo(null)
  })
}

/**
 * Drop users table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users')
}
