import { Model } from 'objection'

class DeletedCloudStorage extends Model {
  static get tableName() {
    return 'deleted_cloudstorage'
  }

  static get idColumn() {
    return 'id'
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        bucket: { type: 'string' },
        location: { type: 'string' },
        ETag: { type: 'string' },
        key: { type: 'string' },
        userId: { type: 'integer' }
      }
    }
  }
}

export default DeletedCloudStorage
