exports.up = function(knex) {
  return knex.schema.alterTable('users', table => {
    table
      .integer('roleId')
      .unsigned()
      .notNullable()
      .defaultTo(3)
      .alter()
  })
}

exports.down = function(knex) {
  return knex.schema.alterTable('users', table => {
    table
      .integer('roleId')
      .unsigned()
      .notNullable()
      .alter()
  })
}
