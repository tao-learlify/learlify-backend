export interface FeedbackGetOneQuery {
  categoryId: number
  examId: number
  model: string
  ignore: boolean
  [key: string]: unknown
}

export interface FeedbackOutputInput {
  model: string
  category: string
  exercises: Record<string, unknown>[]
}
