exports.up = function (knex) {
  return knex.schema.table('plans', table => {
    table
      .integer('modelId')
      .unsigned()
      .notNullable()
      .defaultTo(1)
    table
      .foreign('modelId')
      .references('exam_models.id')
  })
}

exports.down = function (knex) {
  return knex.schema.table('plans', table => {
    table.dropForeign('modelId')
    table.dropColumn('modelId')
  })
}
