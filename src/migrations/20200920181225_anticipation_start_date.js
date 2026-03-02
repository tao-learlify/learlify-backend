/**
 * @param {import ('knex')} knex
 */
exports.up = function (knex) {
  return knex.schema.table('schedule', table => {
    table.dateTime('anticipatedStartDate')
  })
}

/**
 * @param {import ('knex')} knex
 */
exports.down = function (knex) {
  return knex.schema.table('schedule', table => { q
    table.dropColumn('anticipatedStartDate')
  })
}
