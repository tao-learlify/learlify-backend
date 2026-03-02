exports.up = async function(knex) {
  await knex('languages').insert({
    lang: 'Español',
    code: 'es-US'
  })

  await knex('languages').insert({
    lang: 'Inglés',
    code: 'en-GB'
  })
}

exports.down = async function(knex) {
  await knex('languages')
    .where({ code: 'es-US' })
    .del()

  await knex('languages')
    .where({ code: 'en-GB' })
    .del()
}
