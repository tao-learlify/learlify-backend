export interface CreateAccessInput {
  planId: number
  feature: string
}

export interface UpdateAccessInput {
  id: number
  [key: string]: unknown
}
