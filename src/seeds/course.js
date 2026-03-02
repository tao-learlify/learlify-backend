
exports.seed = function(knex) {
  return knex('courses').insert({
    id: 1,
    order: 1
  })
    .then(() => {
      return knex('views')
        .insert({
          id: 1,
          url: 'https://dkmwdxc6g4lk7.cloudfront.net/course-1.json',
          courseId: 1
        })
    })
}
