exports.up = function (knex) {
  return knex.schema.dropTableIfExists('answers').then(() => {
    knex.schema.dropTableIfExists('questions').then(() => {
      knex.schema.dropTableIfExists('exercises')
    })
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('answers')
}
