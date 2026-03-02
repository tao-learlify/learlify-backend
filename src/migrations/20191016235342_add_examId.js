exports.up = function(knex) {
  return knex.schema.table('stats', table => {
    table
      .integer('examId')
      .unsigned()
    table
      .foreign('examId')
      .references('exams.id')
  })
}

exports.down = function(knex) {
  return knex.schema.table('stats', table => {
    table.dropColumn('examId')
  })
}
