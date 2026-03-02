exports.up = function (knex) {
  return knex.schema.table('users', table => {
    table
      .integer('modelId')
      .unsigned()
    table
      .foreign('modelId')
      .references('exam_models.id')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}
  
exports.down = function (knex) {
  return knex.schema.table('users', table => {
    table.dropForeign('modelId')
    table.dropColumn('modelId')
  })
}
  