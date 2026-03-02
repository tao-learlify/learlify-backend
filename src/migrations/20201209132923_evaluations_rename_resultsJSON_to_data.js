exports.up = function (knex) {
  return knex.schema.table('evaluations', table => {
    table.renameColumn('resultsJSON', 'data')
  })
}

exports.down = function (knex) {
  return knex.schema.table('evaluations', table => {
    table.renameColumn('data', 'resultsJSON')
  })
}
