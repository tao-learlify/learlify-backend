exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('category')
    .del()
    .then(function() {
      // Inserts seed entries
      return knex('category').insert([
        { id: 1, name: 'Grammar & Vocabulary' },
        { id: 2, name: 'Listening' },
        { id: 3, name: 'Reading' },
        { id: 4, name: 'Speaking' },
        { id: 5, name: 'Writing' }
      ])
    })
}
