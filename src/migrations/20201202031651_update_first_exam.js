/* eslint-disable no-console */

exports.up = async function (knex) {
  try {
    await knex('exams')
      .update({
        requiresPayment: false
      })
      .where({ id: 1 })

    await knex('exams')
      .update({
        requiresPayment: false
      })
      .where({ id: 11 })
  } catch (err) {
    console.error(err)
  }
}

exports.down = async function (knex) {
  try {
    await knex('exams')
    .update({
      requiresPayment: true
    })
    .where({ id: 1 })

  await knex('exams')
    .update({
      requiresPayment: true
    })
    .where({ id: 11 })
  } catch (err) {
    console.error(err)
  }
}
