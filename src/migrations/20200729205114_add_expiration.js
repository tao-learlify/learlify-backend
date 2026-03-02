/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('classes', table => {
    table.boolean('expired').defaultTo(false)
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('classes', async table => {
    const exist = await knex.schema.hasColumn('classes', 'expired')

    if (exist) {
      table.dropColumn('expired')
    }
  })
}
