/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('evaluations', table => {
    table.string('refVersion').defaultTo('v1')
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('evaluations', table => {
    table.dropColumn('refVersion')
  })
}
