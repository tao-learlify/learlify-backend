exports.up = function (knex) {
  return knex.schema.table('gifts', function (table) {
    table
      .dropForeign('gifter')
    table
      .foreign('gifter')
      .references('users.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}

exports.down = function (knex) {
  return knex.schema.table('gifts', function (table) {
    table
      .dropForeign('gifter')
    table
      .foreign('gifter')
      .references('users.id')
  })
}
