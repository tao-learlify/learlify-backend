exports.up = function(knex) {
  return knex.schema.createTable('cloudstorage', table => {
    table.increments('id').primary()
    table.string('location', 1000).notNullable()
    table.string('bucket').notNullable()
    table.string('ETag').notNullable()
    table.string('key', 1000).notNullable()
    table.integer('userId')
      .unsigned()
      .notNullable()
    table
      .foreign('userId')
      .references('users.id')
      .onDelete('CASCADE')
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('cloudstorage')
}
