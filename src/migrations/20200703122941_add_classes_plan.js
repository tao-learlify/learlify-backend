const PLANS_STATUS = require('../api/plans/plans.status')

exports.up = async function(knex) {
  return knex.schema.table('plans', table => {
    table
      .integer('classes')
      .notNullable()
      .defaultTo(0)
    table.enu('feature', PLANS_STATUS.asArray()).defaultTo(PLANS_STATUS.EXAMS)
  })
}

exports.down = async function(knex) {
  return knex.schema.table('plans', table => {
    table.dropColumn('classes')
    table.dropColumn('feature')
  })
}
