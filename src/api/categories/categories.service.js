import Category from './categories.model'

export class CategoriesService {
  /**
   * @returns {Promise<Category []>}
   */
  getAll () {
    return Category.query()
  }

  /**
   * @param {{ id?: string, name?: string }} params
   * @returns {Promise<Category>} 
   */
  getOne ({ id, name }) {
    if (id) {
      return Category.query().findById(id)
    }
    return Category.query().findOne({ name })
  }
}