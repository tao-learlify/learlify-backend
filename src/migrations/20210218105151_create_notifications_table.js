exports.up = function (knex) {
    return knex.schema.createTable('notifications', table => {
      table
        .increments('id')
        .primary()
      table
        .integer('senderId')
        .unsigned()
      table
        .integer('userId')
        .unsigned()
        .notNullable()
      table.string('message')
      table.boolean('read')
      table.boolean('deleted')
      table
        .integer('type')
        .unsigned()
        .notNullable()
      table.timestamp('expirationDate')
      table
        .foreign('senderId')
        .references('users.id')
      table
        .foreign('userId')
        .references('users.id')
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
      table
        .foreign('type')
        .references('notification_types.id')
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
      table.timestamp('createdAt').defaultTo(knex.fn.now())
    })
  }
  
  exports.down = function (knex) {
    return knex.schema.dropTableIfExists('notifications')
  }
  