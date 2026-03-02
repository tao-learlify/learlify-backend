exports.up = function (knex) {
  return knex('plans').insert({
    name: 'Go',
    currency: 'EUR',
    writing: 0,
    speaking: 0,
    price: 500
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('plans')
}
