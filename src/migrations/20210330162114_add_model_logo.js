/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('exam_models', table => {
    table.string('logo').defaultTo(null)
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('exam_models', table => {
    table.dropColumn('logo')
  })
}
