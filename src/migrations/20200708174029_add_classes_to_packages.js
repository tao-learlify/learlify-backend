exports.up = function(knex) {
  return knex.schema.table('packages', table => {
    table
      .integer('classes')
      .notNullable()
      .defaultTo(0)
  })
}

exports.down = function(knex) {
  return knex.schema.table('packages', table => {
    table.dropColumn('classes')
  })
}
