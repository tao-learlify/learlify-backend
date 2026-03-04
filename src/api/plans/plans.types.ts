export interface PlanSource {
  name?: string
  id?: number
  isActive?: boolean
  [key: string]: unknown
}

export interface GetAllParams {
  names?: string[]
  currency?: string
  [key: string]: unknown
}

export type OffersConfig = Record<string, Record<string, string[]>>
