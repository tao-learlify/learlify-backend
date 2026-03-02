import { Router } from 'decorators'
import { CategoriesController } from './categories.controller'
import { Middleware } from 'middlewares'

@Router({
  alias: 'categories',
  route: '/categories'
})
class CategoriesRouter {
  constructor() {
    this.controller = new CategoriesController()
  }

  httpConsumer() {
    this.categories.get(
      '/',
      [Middleware.authenticate],
      Middleware.secure(this.controller.getAll)
    )

    return this.consumer
  }
}


export default new CategoriesRouter().httpConsumer()
