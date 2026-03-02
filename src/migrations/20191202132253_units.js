exports.up = function () {}

/**
 * Drop roles table.
 * @param {object} knex
 * @returns {Promise}
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('units')
}
