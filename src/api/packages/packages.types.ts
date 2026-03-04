export interface PackageModel {
  id: number
  total?: number
  isActive: boolean
  expirationDate: string
  stripeChargeId?: string
  userId: number
  planId: number
  speakings: number
  writings: number
  classes: number
  isNotified?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreatePackageInput {
  isActive: boolean
  writings: number
  speakings: number
  classes: number
  planId: number
  userId: number
  expirationDate: string
}

export interface TransactionablePackageInput {
  user: { id?: number; email?: string; firstName?: string; lastName?: string; stripeCustomerId?: string }
  plan: { id?: number }
  code: { paymentMethodId?: string; stripeToken?: string }
  expirationDate: string
}

export interface TransactionablePackageResult {
  plan?: unknown
  package?: unknown
  intent?: unknown
  cancelled?: boolean
  error?: boolean
  details?: string
  stack?: string
}

export interface GetAllPackagesParams {
  userId?: number
  isActive?: boolean
  modelId?: number
  date?: {
    today?: string
    ranges?: [string, string]
  }
  [key: string]: unknown
}

export interface GetOnePackageParams {
  id?: number
  modelId?: number
  access?: string
  [key: string]: unknown
}

export interface GetActiveSubscriptionParams {
  userId: number
  competence?: string
}

export interface UpdateOneInput {
  id?: number
  [key: string]: unknown
}

export interface UpdateAndCreateEvaluationInput {
  package: { id: number; speakings?: number; writings?: number; [key: string]: unknown }
  progress: { id: number; examJSON: string }
  type: string
  user: { id: number }
  category: { id: number }
}

export interface UpdateAndCreateEvaluationResult {
  update?: unknown
  evaluation?: unknown
  details?: unknown
  transactionError?: boolean
}

export interface SubscriptionStatus {
  active?: true
  inactive?: true
}

export interface RelationshipConfig {
  plan: Record<string, unknown>
  users: Record<string, unknown>
}

export interface WritingsAndSpeakingsCount {
  speakings?: unknown
  writings?: unknown
}

export interface PackageTaskUserDTO {
  email: string
  lang: string
  firstName: string
}

export interface PackageTaskDTO {
  id: number
  user: PackageTaskUserDTO
}

export interface PackageNotifyFilterDTO {
  date: {
    ranges: [string, string]
  }
  [key: string]: unknown
}

export interface PackageExpireFilterDTO {
  date: {
    today: string
  }
  [key: string]: unknown
}
