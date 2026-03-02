exports.up = function (knex) {
  return knex.schema
    .table('courses', table => {
      table
        .integer('modelId')
        .unsigned()
      table
        .foreign('modelId')
        .references('exam_models.id')
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
    })
    .then(() => {
      return knex('courses')
        .where({ id: 1 })
        .update({ modelId: 1 })
    })
}

exports.down = function (knex) {
  return knex.schema.table('courses', table => {
    table.dropForeign('modelId')
    table.dropColumn('modelId')
  })
}
