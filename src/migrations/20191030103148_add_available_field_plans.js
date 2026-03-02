
exports.up = function(knex) {
  return knex.schema.table('plans', table => {
    table
      .boolean('available')
      .notNullable()
      .defaultTo(true)
  })
}

exports.down = function(knex) {
  return knex.schema.table('plans', table => {
    table.dropColumn('available')
  })
}
