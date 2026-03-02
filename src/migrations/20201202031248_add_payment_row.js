/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('exams', table => {
    table.boolean('requiresPayment')
      .notNullable()
      .defaultTo(true)
  })
}

/**
 * @param {Knex} knex
 */
exports.down =  function (knex) {
  return knex.schema.table('exams', table => {
    table.dropColumn('requiresPayment')
  })
}
