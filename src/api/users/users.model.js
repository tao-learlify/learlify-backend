import { Model } from 'objection'

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

/**
 * User Model
 * @class User
 * @extends {Model}
 */
class User extends Model {
  static get tableName() {
    return 'users'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
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

  static get relationMappings() {
    return {
      model: {
        relation: Model.HasOneRelation,
        modelClass: Models,
        join: {
          from: 'users.modelId',
          to: 'exam_models.id'
        }
      },

      roles: {
        relation: Model.HasOneRelation,
        modelClass: Role,
        join: {
          from: 'users.roleId',
          to: 'roles.id'
        }
      },

      progress: {
        relation: Model.HasManyRelation,
        modelClass: Progress,
        join: {
          from: 'users.id',
          to: 'progress.userId'
        }
      },

      packages: {
        relation: Model.HasManyRelation,
        modelClass: Package,
        join: {
          from: 'users.id',
          to: 'packages.userId'
        }
      },

      evaluations: {
        relation: Model.HasManyRelation,
        modelClass: Evaluation,
        join: {
          from: 'users.id',
          to: 'evaluations.userId'
        }
      },

      cloudstorage: {
        relation: Model.HasManyRelation,
        modelClass: CloudStorage,
        join: {
          from: 'users.id',
          to: 'cloudstorage.userId'
        }
      },

      stats: {
        relation: Model.HasManyRelation,
        modelClass: Stats,
        join: {
          from: 'users.id',
          to: 'stats.userId'
        }
      },

      gifts: {
        relation: Model.HasOneRelation,
        modelClass: Gift,
        join: {
          from: 'users.id',
          to: 'gifts.gifter'
        }
      },

      schedules: {
        relation: Model.HasManyRelation,
        modelClass: Schedule,
        join: {
          from: 'users.id',
          to: 'schedule.userId'
        }
      },

      meetings: {
        relation: Model.HasManyRelation,
        modelClass: Meeting,
        join: {
          from: 'users.id',
          to: 'meetings.userId'
        }
      }
    }
  }

  /**
   * @returns {import ('objection').Modifiers}
   */
  static get modifiers() {
    return {
      withName(builder) {
        return builder.select(['id', 'email', 'firstName', 'lastName', 'lang'])
      },

      evaluation(builder) {
        return builder.select(['id', 'firstName', 'lastName'])
      }
    }
  }
}

export default User
