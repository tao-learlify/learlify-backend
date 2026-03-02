exports.up = function (knex) {
  return knex.schema.table('stats', function (table) {
    table
      .dropForeign('userId')
    table
      .foreign('userId')
      .references('users.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}

exports.down = function (knex) {
  return knex.schema.table('stats', function (table) {
    table
      .dropForeign('userId')
    table
      .foreign('userId')
      .references('users.id')
  })
}
