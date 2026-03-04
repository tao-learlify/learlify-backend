import { Model, type JSONSchema, type RelationMappings, type Modifiers, type QueryBuilder, type ModelClass } from 'objection'
import Advance from 'api/advance/advance.model'
import View from 'api/views/views.model'
import Models from 'api/models/models.model'

class Course extends Model {
  id!: number
  order?: number
  modelId?: number
  createdAt?: string
  advances?: unknown[]

  static get tableName(): string {
    return 'courses'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        id: { type: 'integer' }
      }
    }
  }

  static get relationMappings(): RelationMappings {
    return {
      views: {
        modelClass: View as unknown as ModelClass<Model>,
        relation: Model.HasOneRelation,
        join: {
          from: 'courses.id',
          to: 'views.courseId'
        }
      },

      advance: {
        modelClass: Advance as unknown as ModelClass<Model>,
        relation: Model.HasManyRelation,
        join: {
          from: 'courses.id',
          to: 'advance.courseId'
        }
      },

      model: {
        modelClass: Models as unknown as ModelClass<Model>,
        relation: Model.HasOneRelation,
        join: {
          from: 'courses.modelId',
          to: 'exam_models.id'
        }
      }
    }
  }

  static get modifiers(): Modifiers {
    return {
      clientAttributes(sql: QueryBuilder<Course>) {
        sql.select(['createdAt', 'id'])
      }
    }
  }
}

export default Course
