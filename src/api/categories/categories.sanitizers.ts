import Categories from './categories.model'
import type { CategoryModel } from './categories.types'

class CategoriesSanitizer {
  static async findOne(data: Partial<CategoryModel>): Promise<void> {
    const sanitize = await Categories.query().findOne(data as Record<string, unknown>)

    if (sanitize === undefined) {
      Promise.reject()
    }
  }
}

export { CategoriesSanitizer }
