exports.up = function (knex) {
  return knex.schema.table('users', table => {
    table
      .string('facebookId')
      .nullable()
      .defaultTo(null)
  })
}

exports.down = function (knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('facebookId')
  })
}
