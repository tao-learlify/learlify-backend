exports.up = function (knex) {
  return knex.schema.table('results', function (table) {
    table
      .dropForeign('evaluationId')
    table
      .foreign('evaluationId')
      .references('evaluations.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}

exports.down = function (knex) {
  return knex.schema.table('results', function (table) {
    table
      .dropForeign('evaluationId')
    table
      .foreign('evaluationId')
      .references('evaluations.id')
  })
}
