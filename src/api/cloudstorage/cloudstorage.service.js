import { Bind } from 'decorators'
import Cloudstorage from './cloudstorage.model'

export class CloudStorageService {
  #clientAttributes

  constructor () {
    this.#clientAttributes = [
      'createdAt',
      'key',
      'id'
    ]
  }

  create(storage) {
    return Cloudstorage.query().insertAndFetch(storage)
  }

  @Bind
  findOne(storage) {
    return Cloudstorage.query()
      .findOne(storage)
      .select(this.#clientAttributes)
  }
}
