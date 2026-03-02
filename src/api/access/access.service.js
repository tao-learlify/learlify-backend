import { Bind } from 'decorators'
import Access from './access.model'
import { Logger } from 'api/logger'

export class AccessService {
  constructor() {
    this.logger = Logger.Service
  }

  @Bind
  create(access) {
    return Access.query().insertAndFetch(access)
  }

  @Bind
  getAll() {
    return Access.query()
  }

  @Bind
  getOne(id) {
    return Access.query().findById(id)
  }

  @Bind
  updateOne(id, data) {
    return Access.query().patchAndFetchById(id, data)
  }
}
