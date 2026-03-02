exports.up = function(knex) {
  return knex.schema.table('questions', table => {
    table
      .integer('strictOrder')
      .unsigned()
  })
}

exports.down = function(knex) {
  return knex.schema.table('questions', table => {
    table.dropColumn('strictOrder')
  })
}
