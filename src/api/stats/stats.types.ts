import type { Knex } from 'knex'

export interface ScoreContext {
  value: number
  model: string
  category: string
}

export interface ScoreResult {
  bandScore: number
  marking: string
  points: number
}

export interface StatCreateParams {
  categoryId: number
  userId: number
  trx?: Knex.Transaction
  [key: string]: unknown
}

export interface StatsAndProgressData {
  stats: Record<string, unknown>
  progress: { id: number; [key: string]: unknown }
}

export interface ModelRef {
  id?: number
  name: string
  [key: string]: unknown
}

export type AptisRange = [number, number, string]

export type IeltsRange = [number, number, number]

export interface CategoryScoreConfig {
  points?: number
  score?: number[][][] | number[][]
  ranges: (AptisRange | IeltsRange)[]
}
