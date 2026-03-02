/* eslint-disable no-console */
/**
 * @param {Knex} knex
 */
exports.up = async function (knex) {
  const [model] = await knex('exam_models').where({ name: 'IELTS' })

  try {
    await knex('views')
      .update({
        url: 'https://dkmwdxc6g4lk7.cloudfront.net/courses/aptis.json'
      })
      .where({ id: 1 })

     await knex('courses').insert({
      id: 2,
      modelId: model.id,
      order: 1
    })

    await knex('views').insert({
      courseId: 2,
      url: 'https://dkmwdxc6g4lk7.cloudfront.net/courses/ielts.json'
    })
  } catch (err) {
    console.log('Migration Error', err)
  }
}

/**
 * @param {Knex} knex
 */
exports.down = async function (knex) {
  await knex('courses').where({ id: 2 }).del()
  await knex('views').where({ id: 2 }).del()
}
