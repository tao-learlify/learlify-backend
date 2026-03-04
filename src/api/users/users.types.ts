export interface UserGetAllParams {
  page: number
  limit?: number
  roleId?: number
  [key: string]: unknown
}

export interface UserGetOneParams {
  id?: number
  allowPrivateData?: boolean
  identity?: boolean
  email?: string
  [key: string]: unknown
}

export interface UserRelationshipConfig {
  getAll: Record<string, unknown>
  getOne: Record<string, unknown>
}
