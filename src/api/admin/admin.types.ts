export interface CreateUserBody {
  email: string
  firstName: string
  lastName: string
  role: string
  modelId?: number
}

export interface CreateUserInput {
  email: string
  firstName: string
  lastName: string
  password: string | undefined
  roleId: number
  isVerified: boolean
}

export interface ViewUserInfoQuery {
  email: string
}
