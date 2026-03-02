/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  const context = {
    classes: false,
    config: false,
    courses: false,
    dashboard: false,
    exams: {
      grammar: false,
      listening: false,
      reading: false,
      speakings: false,
      vocabulary: false,
      writings: false
    },
    gifts: false,
    pricing: false
  }
  return knex.schema.table('users', table => {
    table.json('tour').defaultTo(context)
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('tour')
  })
}