/**
 * @param {Knex} knex
 */
exports.up = async knex => {
  const exams = await knex('exams').select()

  return Promise.all(
    exams.map(exam =>
      knex('exams')
        .where({ id: exam.id })
        .update({
          dir: exam.dir.split('/').reverse()[0]
        })
    )
  )
}

/**
 * @param {Knex} knex
 */
exports.down = async knex => {
  const exams = await knex('exams').select()

  return Promise.all(
    exams.map(exam =>
      knex('exams')
        .where({ id: exam.id })
        .update({
          dir: 'https://dkmwdxc6g4lk7.cloudfront.net/exams/' + exam.dir
        })
    )
  )
}
