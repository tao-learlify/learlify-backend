const uuid = require('uuid').v4

/**
 * @param {Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('progress', table => {
    table
      .json('data')
      .defaultTo({
        uuuid: uuid(),
        'Grammar & Vocabulary': {
          feedback: [],
          lastIndex: 0,
          points: 0,
          score: 0
        },
        Listening: {
          feedback: [],
          lastIndex: 0,
          points: 0,
          score: 0
        },
        Reading: {
          feedback: [],
          lastIndex: 0,
          points: 0,
          score: 0
        },
        Speaking: {
          cloudStorageRef: [],
          lastIndex: 0
        },
        Writing: {
          feedback: [],
          lastIndex: 0
        }
      })
      .alter()
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('progress', table => {
    table.json('data').defaultTo(null).alter()
  })
}
