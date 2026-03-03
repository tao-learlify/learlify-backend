import Category from './categories.model'
import { QueryBuilder } from 'objection'
import type { GetOneCategoryParams } from './categories.types'

export class CategoriesService {
  getAll(): QueryBuilder<Category, Category[]> {
    return Category.query()
  }

  getOne({ id, name }: GetOneCategoryParams): QueryBuilder<Category, Category | undefined> {
    if (id) {
      return Category.query().findById(id) as unknown as QueryBuilder<Category, Category | undefined>
    }
    return Category.query().findOne({ name })
  }
}
