const config = require('../config')

/**
 * @param {import ('Knex')} knex
 */
exports.up = function (knex) {
  return knex.schema.table('meetings', table => {
    table.string('timezone').notNullable().defaultTo(config.default.TZ)
  })
}

/**
 * @param {import ('Knex')} knex
 */
exports.down = function (knex) {
  return knex.schema.table('meetings', table => {
    table.dropColumn('timezone')
  })
}
