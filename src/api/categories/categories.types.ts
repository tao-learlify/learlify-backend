export interface CategoryModel {
  id: number
  name: string
}

export interface GetAllCategoriesResponse {
  response: CategoryModel[]
  statusCode: 200
}

export interface GetOneCategoryParams {
  id?: string
  name?: string
}
