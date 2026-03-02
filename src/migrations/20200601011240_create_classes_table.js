exports.up = function (knex) {
  return knex.schema.createTable('classes', table => {
    table.increments('id').primary()

    table.integer('scheduleId').unsigned().notNullable()

    table
      .foreign('scheduleId')
      .references('schedule.id')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table.timestamp('createdAt').defaultTo(knex.fn.now())

    table.timestamp('updatedAt').defaultTo(knex.fn.now())
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('classes')
}
