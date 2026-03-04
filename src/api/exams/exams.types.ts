export interface FindCloudS3ResourceQuery {
  name?: string
  id?: number
}

export interface GetAllExamsParams {
  getIds?: boolean
  modelId?: number | string
}

export interface GetOneExamQuery {
  withoutGraph?: boolean
  id?: number
  user?: number
  [key: string]: unknown
}
