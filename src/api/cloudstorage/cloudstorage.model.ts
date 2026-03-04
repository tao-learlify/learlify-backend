import { Model } from 'objection'
import type { JSONSchema, RelationMappings, ModelClass } from 'objection'

import User from 'api/users/users.model'

class CloudStorage extends Model {
  id!: number
  bucket!: string
  location!: string
  ETag!: string
  key!: string
  userId!: number

  static get tableName(): string {
    return 'cloudstorage'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        bucket: { type: 'string' },
        location: { type: 'string' },
        ETag: { type: 'string' },
        key: { type: 'string' },
        userId: { type: 'integer' },
      }
    }
  }

  static get relationMappings(): RelationMappings {
    return {
      users: {
        relation: Model.HasOneRelation,
        modelClass: User as unknown as ModelClass<Model>,
        join: {
          from: 'cloudstorage.userId',
          to: 'users.id'
        }
      }
    }
  }
}

export default CloudStorage
