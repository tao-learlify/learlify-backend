/**
 * 
 * @param {import ('knex')} knex 
 */
exports.up = function(knex) {
  return knex.schema.createTable('schedule', table => {
    table.increments('id').primary()

    table.dateTime('startDate')

    table.dateTime('endDate')

    table
      .integer('langId')
      .unsigned()
      .notNullable()

    table.string('notes', 255)

    table
      .integer('userId')
      .unsigned()
      .notNullable()

    table
      .foreign('langId')
      .references('languages.id')
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
  return knex.schema.dropTableIfExists('schedule')
}
