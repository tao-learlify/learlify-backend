import type { CreateAccessInput } from './access.types'
import { Bind } from 'decorators'
import Access from './access.model'
import { Logger } from 'api/logger'

export class AccessService {
  private logger: typeof Logger.Service

  constructor() {
    this.logger = Logger.Service
  }

  @Bind
  create(access: CreateAccessInput) {
    return Access.query().insertAndFetch(access as unknown as Record<string, unknown>)
  }

  @Bind
  getAll() {
    return Access.query()
  }

  @Bind
  getOne(id: number) {
    return Access.query().findById(id)
  }

  @Bind
  updateOne(id: number, data: Record<string, unknown>) {
    return Access.query().patchAndFetchById(id, data)
  }
}
