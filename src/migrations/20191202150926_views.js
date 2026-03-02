exports.up = function(knex) {
  return knex.schema.createTable('views', table => {
    table.increments('id').primary()
    table.string('url', 1000).notNullable()
    table.timestamp('createdAt').defaultTo(knex.fn.now())
    table.foreign('courseId').references('courses.id')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    table.integer('courseId').unsigned().notNullable()
  })
}

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('views')
}
