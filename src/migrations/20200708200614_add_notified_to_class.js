const uuid = require('uuid').v4

exports.up = function(knex) {
  return knex.schema.table('classes', table => {
    table.string('name').defaultTo(uuid())
  })
}

exports.down = function(knex) {
  return knex.schema.table('classes', table => {
    table.dropColumn('name')
  })
}
