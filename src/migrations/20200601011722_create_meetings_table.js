exports.up = function(knex) {
  return knex.schema.createTable('meetings', table => {
    table.increments('id').primary()

    table.boolean('closed').defaultTo(false)

    table
      .integer('classId')
      .unsigned()
      .notNullable()

    table
      .integer('userId')
      .unsigned()
      .notNullable()

    table
      .foreign('classId')
      .references('classes.id')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table
      .foreign('userId')
      .references('users.id')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table.timestamp('createdAt').defaultTo(knex.fn.now())

    table.timestamp('updatedAt').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('meetings')
}
