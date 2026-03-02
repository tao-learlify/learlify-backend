/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('exams', table => {
    table.string('imageUrl').defaultTo(null)
    table.string('alternImageUrl').defaultTo(null)
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('exams', table => {
    table.dropColumn('imageUrl')
    table.dropColumn('alternImageUrl')
  })
}
