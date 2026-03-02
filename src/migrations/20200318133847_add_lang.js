exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table
      .string('lang')
      .defaultTo('es-US')
      .notNullable()
  })
}

exports.down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('lang')
  })
}
