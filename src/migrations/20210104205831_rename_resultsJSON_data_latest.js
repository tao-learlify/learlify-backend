/**
 * @param {Knex} knex 
 */
exports.up = function (knex) {
  return knex.schema.table('latest_evaluations', table => {
    table.renameColumn('resultsJSON', 'data')
  })
}

/**
 * @param {Knex} knex 
 */
exports.down = function (knex) {
  return knex.schema.table('latest_evaluations', table => {
    table.renameColumn('data', 'resultsJSON')
  })
}
