import type { Knex } from 'knex'

exports.up = async (knex: Knex): Promise<void> => {
  const [model] = await knex('exam_models').where({ name: 'IELTS' })

  const [planId] = await knex('plans').insert({
    available: true,
    classes: 0,
    currency: 'EUR',
    feature: 'EXAMS',
    modelId: model.id,
    name: 'Curso IELTS',
    pandaUrl: 'https://dkmwdxc6g4lk7.cloudfront.net/assets/img/curso aptis.png',
    price: 1999,
    speaking: 0,
    writing: 0
  })

  await knex('access').insert({
    planId,
    feature: 'COURSES'
  })
}

exports.down = async (knex: Knex): Promise<void> => {
  const [plan] = await knex('plans').where({ name: 'Curso IELTS' })

  await knex('access').where({ planId: plan.id }).del()

  await knex('plans').where({ name: 'Curso IELTS' }).del()
}
