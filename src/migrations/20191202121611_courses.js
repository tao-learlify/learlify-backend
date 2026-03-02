exports.up = function(knex) {
  return knex.schema.createTable('courses', table => {
    /**
     * @alias PrimaryKey
     */
    table.increments('id').primary()
    /**
     * @alias Order
     */
    table.integer('order').notNullable()
    /**
     * @alias CreatedAt
     */
    table.timestamp('createdAt').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('courses')
}
