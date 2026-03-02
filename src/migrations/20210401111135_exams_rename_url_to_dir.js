/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('exams', table => {
    table.renameColumn('url', 'dir')
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('exams', table => {
    table.renameColumn('dir', 'url')
  })
}
