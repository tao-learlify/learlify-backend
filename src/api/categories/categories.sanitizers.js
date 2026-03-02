import Categories from './categories.model'

class CategoriesSanitizer {
  static async findOne (data) {
    const sanitize = await Categories.query().findOne(data)
    
    if (sanitize === undefined) {
      Promise.reject()
    }
  }
}

export { CategoriesSanitizer}