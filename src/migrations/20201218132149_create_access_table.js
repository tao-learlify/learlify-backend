exports.up = function (knex) {
  return knex.schema.createTable('access', table => {
    table.increments('id').primary()
    table.integer('planId').unsigned().notNullable()
    table.enu('feature', ['EXAMS', 'COURSES', 'EVALUATIONS', 'CLASSES'])
    table.foreign('planId').references('plans.id')
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('access')
}
