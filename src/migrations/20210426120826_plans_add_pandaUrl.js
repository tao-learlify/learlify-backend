/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('plans', table => {
    table.string('pandaUrl')
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('plans', table => {
    table.dropColumn('pandaUrl')
  })
}
