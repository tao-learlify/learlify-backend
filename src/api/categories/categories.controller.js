import { Bind } from 'decorators'
import { CategoriesService } from './categories.service'


class CategoriesController {
  constructor () {
    this.categoriesService = new CategoriesService()
  }

  /**
   * 
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  @Bind
  async getAll (req, res) {
    const categories = await this.categoriesService.getAll()

    return res.json({
      response: categories,
      statusCode: 200
    })
  }
}

export { CategoriesController }