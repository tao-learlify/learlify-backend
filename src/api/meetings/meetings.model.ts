import { Model } from 'objection'
import type { JSONSchema, RelationMappings, Modifiers, QueryBuilder } from 'objection'
import Classes from 'api/classes/classes.model'
import User from 'api/users/users.model'
import type { ModelClass } from 'objection'

class Meeting extends Model {
  id!: number
  classId?: number
  userId?: number
  closed?: boolean
  timezone?: string
  user?: Record<string, unknown>
  meetings?: Meeting[]

  static get tableName(): string {
    return 'meetings'
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
      classes: {
        modelClass: Classes as unknown as ModelClass<Model>,
        relation: Model.HasManyRelation,
        join: {
          from: 'meetings.classId',
          to: 'classes.id'
        }
      },

      user: {
        modelClass: User as unknown as ModelClass<Model>,
        relation: Model.HasOneRelation,
        join: {
          from: 'meetings.userId',
          to: 'users.id'
        }
      }
    }
  }

  static get modifiers(): Modifiers {
    return {
      withData(builder: QueryBuilder<Meeting>) {
        builder.select(['closed', 'timezone']).withGraphFetched({
          user: {
            $modify: ['withName']
          }
        })
      },

      withUser(builder: QueryBuilder<Meeting>) {
        builder.select(['closed, userId'])
      }
    }
  }
}

export default Meeting
