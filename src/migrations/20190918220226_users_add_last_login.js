exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table
      .string('lastLogin')
      .nullable()
      .defaultTo(null)
  })
}

exports.down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('lastLogin')
  })
}
