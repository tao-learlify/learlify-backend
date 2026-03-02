/**
 * @param {Knex} knex 
 */
exports.up = function (knex) {
  return knex.schema.table('evaluations', table => {
    table
      .integer('examId')
      .unsigned()
    table
      .foreign('examId')
      .references('exams.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}
 
/**
 * @param {Knex} knex 
 */
exports.down = function (knex) {
  return knex.schema.table('evaluations', table => {
    table.dropForeign('examId')
    table.dropColumn('examId')
  })
}
  