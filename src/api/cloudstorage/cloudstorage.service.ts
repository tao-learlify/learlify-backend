import CloudStorage from './cloudstorage.model'
import type { CloudStorageInput } from './cloudstorage.types'

export class CloudStorageService {
  private clientAttributes: string[]

  constructor() {
    this.clientAttributes = [
      'createdAt',
      'key',
      'id'
    ]
  }

  create(storage: CloudStorageInput) {
    return CloudStorage.query().insertAndFetch(storage)
  }

  findOne(storage: Partial<CloudStorageInput>) {
    return CloudStorage.query()
      .findOne(storage)
      .select(this.clientAttributes)
  }
}
