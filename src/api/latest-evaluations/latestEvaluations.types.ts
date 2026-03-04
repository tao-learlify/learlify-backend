export interface LatestEvaluationGetAllParams {
  page: number
  limit?: number
  teacherId?: number
  userId?: number
  [key: string]: unknown
}

export interface LatestEvaluationCountParams {
  teacherId?: number
  categoryId?: number
  [key: string]: unknown
}
