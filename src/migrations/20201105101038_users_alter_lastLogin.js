const moment = require('moment')

exports.up = function (knex) {
  return knex('users').update({
    lastLogin: moment().format('YYYY-MM-DD')
  })
}

exports.down = function () {}
