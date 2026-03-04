import { Model, type JSONSchema, type RelationMappings, type Modifiers, type QueryBuilder, type ModelClass } from 'objection'
import Progress from 'api/progress/progress.model'
import Stats from 'api/stats/stats.model'
import Models from 'api/models/models.model'
import Evaluation from 'api/evaluations/evaluations.model'

class Exam extends Model {
  id!: number
  name?: string
  createdAt?: string
  dir?: string
  requiresPayment?: boolean
  version?: string
  imageUrl?: string
  alternImageUrl?: string
  examModelId?: number

  static get tableName(): string {
    return 'exams'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        createdAt: { type: 'string' }
      }
    }
  }

  static get relationMappings(): RelationMappings {
    return {
      progress: {
        relation: Model.HasManyRelation,
        modelClass: Progress as unknown as ModelClass<Model>,
        join: {
          from: 'exams.id',
          to: 'progress.examId'
        }
      },

      stats: {
        relation: Model.HasManyRelation,
        modelClass: Stats as unknown as ModelClass<Model>,
        join: {
          from: 'exams.id',
          to: 'stats.examId'
        }
      },

      model: {
        relation: Model.BelongsToOneRelation,
        modelClass: Models as unknown as ModelClass<Model>,
        join: {
          from: 'exams.examModelId',
          to: 'exam_models.id'
        }
      },

      evalaution: {
        relation: Model.HasOneRelation,
        modelClass: Evaluation as unknown as ModelClass<Model>,
        join: {
          from: 'exams.id',
          to: 'evaluations.examId'
        }
      }
    }
  }

  static get modifiers(): Modifiers {
    return {
      stats(builder: QueryBuilder<Exam>) {
        builder.select(['id'])
      },

      name(builder: QueryBuilder<Exam>) {
        builder.select(['name'])
      },

      clientAttributes(builder: QueryBuilder<Exam>) {
        builder.select(['id', 'name', 'dir', 'requiresPayment', 'version'])
      },

      model(builder: QueryBuilder<Exam>) {
        builder.withGraphFetched({ model: true })
      }
    }
  }
}

export default Exam
