import type { Request, Response } from 'express'
import { Bind } from 'decorators'
import { CategoriesService } from './categories.service'
import type { CategoryModel } from './categories.types'

export class CategoriesController {
  private categoriesService: CategoriesService

  constructor() {
    this.categoriesService = new CategoriesService()
  }

  @Bind
  async getAll(_req: Request, res: Response): Promise<Response> {
    const categories = await this.categoriesService.getAll() as unknown as CategoryModel[]

    return res.json({
      response: categories,
      statusCode: 200
    })
  }
}
