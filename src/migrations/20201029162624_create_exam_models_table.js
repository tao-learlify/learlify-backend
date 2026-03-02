const HEXADECIMAL_LENGTH = 7

exports.up = function (knex) {
  return knex.schema
    .createTable('exam_models', table => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.string('color', HEXADECIMAL_LENGTH).notNullable()
      table.timestamp('updatedAt').defaultTo(knex.fn.now())
      table.timestamp('createdAt').defaultTo(knex.fn.now())
    })
    .then(function () {
      return knex('exam_models').insert([
        { id: 1, color: '#EBB02C', name: 'Aptis' },
        { id: 2, color: '#24406B', name: 'IELTS' }
      ])
    })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('exam_models')
}
