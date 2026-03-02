/**
 * @param {Knex} knex 
 */
exports.up = function (knex) {
  return knex.schema.table('stats', table => {
    table
      .integer('evaluationId')
      .unsigned()
    table
      .foreign('evaluationId')
      .references('evaluations.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}
  
/**
 * @param {Knex} knex 
 */
exports.down = function (knex) {
  return knex.schema.table('stats', table => {
    table.dropForeign('evaluationId')
    table.dropColumn('evaluationId')
  })
}
  