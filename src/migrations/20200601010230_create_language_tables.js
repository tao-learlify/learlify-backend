const langMaximumLength = 10

exports.up = function(knex) {
  return knex.schema.createTable('languages', table => {
    table.increments('id').primary()

    table.string('lang', langMaximumLength).notNullable()

    table.string('code', langMaximumLength).notNullable()

    table.timestamp('createdAt').defaultTo(knex.fn.now())

    table.timestamp('updatedAt').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('languages')
}
