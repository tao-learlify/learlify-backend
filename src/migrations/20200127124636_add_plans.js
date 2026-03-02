
exports.up = function(knex) {
  return knex('plans').insert({
    name: 'Curso Aptis',
    currency: 'EUR',
    writing: 0,
    speaking: 0,
    price: 1499
  })
};

exports.down = function(knex) {
  return knex('plans')
    .where('name', 'Curso Aptis')
    .del()
};
