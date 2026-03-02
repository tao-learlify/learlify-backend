exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('plans')
    .del()
    .then(function() {
      // Inserts seed entries
      return knex('plans').insert([
        {
          id: 1,
          name: 'Silver',
          currency: 'EUR',
          writing: 5,
          speaking: 0,
          price: 1200
        },
        {
          id: 2,
          name: 'Gold',
          currency: 'EUR',
          writing: 0,
          speaking: 5,
          price: 1500
        },
        {
          id: 3,
          name: 'Platinum',
          currency: 'EUR',
          writing: 5,
          speaking: 5,
          price: 2100
        }
      ])
    })
}
