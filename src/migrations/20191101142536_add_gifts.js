exports.up = function (knex) {
  return knex.schema.createTable('gifts', table => {
    table.increments('id').primary()
    table.string('email').notNullable()
    table.string('serial').notNullable()
    table.boolean('expired').notNullable().defaultTo(false)
    table.foreign('gifter').references('users.id')
    table.foreign('planId').references('plans.id')
    table.integer('gifter').unsigned().notNullable()
    table.integer('planId').unsigned().notNullable()
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('gifts')
}
