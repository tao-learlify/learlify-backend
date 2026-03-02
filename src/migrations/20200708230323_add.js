exports.up = function(knex) {
  return knex.schema.table('schedule', table => {
    table
      .boolean('taken')
      .notNullable()
      .defaultTo(false)
    table
      .boolean('notified')
      .notNullable()
      .defaultTo(false)
  })
}

exports.down = function(knex) {
  return knex.schema.table('schedule', table => {
    table.dropColumn('taken')
    table.dropColumn('notified')
  })
}
