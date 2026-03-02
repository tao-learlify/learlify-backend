exports.up = function (knex) {
  return knex.schema.table('progress', table => {
    table.renameColumn('examJSON', 'data')
  })
}

exports.down = function (knex) {
  return knex.schema.table('progress', table => {
    table.renameColumn('data', 'examJSON')
  })
}
