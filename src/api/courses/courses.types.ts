export interface GetAllCoursesQuery {
  demo: boolean
  model: string
}

export interface CourseGetOneQuery {
  id?: number
  [key: string]: unknown
}
