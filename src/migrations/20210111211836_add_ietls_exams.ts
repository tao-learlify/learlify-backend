import type { Knex } from 'knex'

exports.up = async function (knex: Knex): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await knex('exams').insert({
      name: `Exam ${index + 1}`,
      url: `https://dkmwdxc6g4lk7.cloudfront.net/exams/ielts-0${
        index + 1
      }.json`,
      examModelId: 2
    })
  }
}

exports.down = function (knex: Knex): unknown {
  return knex('exams')
    .where({
      examModelId: 2
    })
    .del()
}
