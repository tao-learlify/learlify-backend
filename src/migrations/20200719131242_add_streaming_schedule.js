/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('schedule', table => {
    table.boolean('streaming').defaultTo(false)
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('schedule', table => {
    table.dropColumn('streaming')
  })
}
