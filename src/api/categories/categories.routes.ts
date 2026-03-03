import type { Router as ExpressRouter } from 'express'
import type { HttpConsumer } from '@types'
import { Router } from 'decorators'
import { CategoriesController } from './categories.controller'
import { Middleware } from 'middlewares'

@Router({
  alias: 'categories',
  route: '/categories'
})
class CategoriesRouter {
  declare categories: ExpressRouter
  declare consumer: HttpConsumer
  private controller: CategoriesController

  constructor() {
    this.controller = new CategoriesController()
  }

  httpConsumer(): HttpConsumer {
    this.categories.get(
      '/',
      [Middleware.authenticate],
      Middleware.secure(this.controller.getAll)
    )

    return this.consumer
  }
}

export default new CategoriesRouter().httpConsumer()
