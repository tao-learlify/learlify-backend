/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('exams', table => {
    table.string('version').defaultTo('v1')
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('exams', table => {
    table.dropColumn('version')
  })
}
