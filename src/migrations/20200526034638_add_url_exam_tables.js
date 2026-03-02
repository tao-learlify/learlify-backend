/**
 * @param {Knex} knex 
 */
exports.up = function (knex) {
  return knex.schema.table('exams', table => {
    table.string('url').notNullable().defaultTo('https://aws.com/filename')
  })
}

/**
 * @param {Knex} knex 
 */
exports.down = function (knex) {
  return knex.schema.table('exams', table => {
    table.dropColumn('url')
  })
}
