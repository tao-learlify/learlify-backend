/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('category', table => {
    table.string('imageUrl').defaultTo(null)
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('category', table => {
    table.dropColumn('imageUrl')
  })
}
