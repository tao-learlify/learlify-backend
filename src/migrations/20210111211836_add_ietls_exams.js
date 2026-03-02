/**
 * @param {Knex} knex
 */
exports.up = async function (knex) {
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

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex('exams')
    .where({
      examModelId: 2
    })
    .del()
}
