import type { Knex } from 'knex'

exports.up = async function (knex: Knex): Promise<void> {
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
    globalThis.console.log('Migration Error', err)
  }
}

exports.down = async function (knex: Knex): Promise<void> {
  await knex('courses').where({ id: 2 }).del()
  await knex('views').where({ id: 2 }).del()
}
