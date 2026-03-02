/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('progress', table => {
    table.dropColumn('completed')
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('progress', table => {
    table.boolean('completed').notNullable().defaultTo(false)
  })
}
