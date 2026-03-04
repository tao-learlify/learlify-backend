export interface EvaluationGetAllParams {
  page: number
  paginationLimit?: number
  userId?: number
  modelId?: number
  count?: boolean
  options?: Record<string, unknown>
  teacherId?: number
  [key: string]: unknown
}

export interface EvaluationFindOneParams {
  early?: boolean
  id?: number
  [key: string]: unknown
}

export interface EvaluationUpdateInput {
  id: number
  [key: string]: unknown
}

export interface PatchAndCreateResultsInput {
  id: number
  data: Record<string, unknown>
}

export interface EvaluationComment {
  html: string
  text: string
}
