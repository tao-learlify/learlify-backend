exports.up = function (knex) {
  return knex.schema
    .createTable('notification_types', table => {
      table.increments('id').primary()
      table.string('name')
      table.string('template')
      table
        .enu('context', ['danger', 'info', 'success', 'warning'])
        .notNullable()
      table.integer('expirationTime').defaultTo(1)
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
      table.timestamp('createdAt').defaultTo(knex.fn.now())
    })
    .then(() => {
      return knex('notification_types').insert([
        { name: 'PaymentCompleted', context: 'success' },
        { name: 'PaymentExpired', context: 'info' },
        { name: 'PaymentNotify', context: 'warning' },
        { name: 'EvaluationCompleted', context: 'success' },
        { name: 'EvaluationPending', context: 'info' },
        { name: 'Schedule', context: 'info' },
        { name: 'DeleteSchedule', context: 'danger' },
        { name: 'MeetingStart', context: 'success' },
        { name: 'MeetingExpired', context: 'info' },
        { name: 'Announcement', context: 'info' },
        { name: 'AdminPrivateMessage', context: 'info' },
        { name: 'Feedback', context: 'success' }
      ])
    })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('notification_types')
}
