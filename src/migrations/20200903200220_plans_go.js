/* eslint-disable no-console */
/**
 * @param {import ('knex')} knex
 */
exports.up = async function (knex) {
  try {
    await knex('plans').update({ price: 900 }).where({ name: 'Go' })
  } catch (err) {
    console.error(err)
  }
}

/**
 * @param {import ('knex')} knex
 */
exports.down = async function (knex) {
  try {
    await knex('plans').update({ price: 500 }).where({ name: 'Go' })
  } catch (err) {
    console.log(err)
  }
}
