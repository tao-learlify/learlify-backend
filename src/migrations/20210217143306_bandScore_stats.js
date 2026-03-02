/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('stats', table => {
    table.integer('bandScore', 9).unsigned()
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('stats', table => {
    table.dropColumn('bandScore')
  })
}
