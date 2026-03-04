import { Model } from 'objection'
import type { JSONSchema, RelationMappings, Modifiers, QueryBuilder, ModelClass } from 'objection'

import Role from 'api/roles/roles.model'
import Package from 'api/packages/packages.model'
import Progress from 'api/progress/progress.model'
import CloudStorage from 'api/cloudstorage/cloudstorage.model'
import Stats from 'api/stats/stats.model'
import Gift from 'api/gifts/gifts.model'
import Schedule from 'api/schedule/schedule.model'
import Evaluation from 'api/evaluations/evaluations.model'
import Meeting from 'api/meetings/meetings.model'
import Models from 'api/models/models.model'

class User extends Model {
  id!: number
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  roleId?: number
  modelId?: number
  imageUrl?: string
  isVerified?: boolean
  lang?: string
  lastLogin?: string
  stripeCustomerId?: string
  googleId?: string
  facebookId?: string
  tour?: string
  createdAt?: string
  updatedAt?: string
  role?: Record<string, unknown>
  model?: Record<string, unknown>

  static get tableName(): string {
    return 'users'
  }

  static get idColumn(): string {
    return 'id'
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',

      required: ['email', 'password', 'firstName', 'lastName'],

      properties: {
        id: { type: 'integer' },
        email: { type: 'string', maxLength: 255 },
        password: { type: 'string', minLength: 1 },
        firstName: { type: 'string', minLength: 1, maxLength: 30 },
        lastName: { type: 'string', minLength: 1, maxLength: 30 },
        roleId: { type: 'integer' },
        modelId: { type: 'integer' }
      }
    }
  }

  static get relationMappings(): RelationMappings {
    return {
      model: {
        relation: Model.HasOneRelation,
        modelClass: Models as unknown as ModelClass<Model>,
        join: {
          from: 'users.modelId',
          to: 'exam_models.id'
        }
      },

      roles: {
        relation: Model.HasOneRelation,
        modelClass: Role as unknown as ModelClass<Model>,
        join: {
          from: 'users.roleId',
          to: 'roles.id'
        }
      },

      progress: {
        relation: Model.HasManyRelation,
        modelClass: Progress as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'progress.userId'
        }
      },

      packages: {
        relation: Model.HasManyRelation,
        modelClass: Package as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'packages.userId'
        }
      },

      evaluations: {
        relation: Model.HasManyRelation,
        modelClass: Evaluation as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'evaluations.userId'
        }
      },

      cloudstorage: {
        relation: Model.HasManyRelation,
        modelClass: CloudStorage as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'cloudstorage.userId'
        }
      },

      stats: {
        relation: Model.HasManyRelation,
        modelClass: Stats as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'stats.userId'
        }
      },

      gifts: {
        relation: Model.HasOneRelation,
        modelClass: Gift as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'gifts.gifter'
        }
      },

      schedules: {
        relation: Model.HasManyRelation,
        modelClass: Schedule as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'schedule.userId'
        }
      },

      meetings: {
        relation: Model.HasManyRelation,
        modelClass: Meeting as unknown as ModelClass<Model>,
        join: {
          from: 'users.id',
          to: 'meetings.userId'
        }
      }
    }
  }

  static get modifiers(): Modifiers {
    return {
      withName(builder: QueryBuilder<User>) {
        return builder.select(['id', 'email', 'firstName', 'lastName', 'lang'])
      },

      evaluation(builder: QueryBuilder<User>) {
        return builder.select(['id', 'firstName', 'lastName'])
      }
    }
  }
}

export default User
