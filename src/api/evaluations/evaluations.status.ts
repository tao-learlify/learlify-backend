export const PENDING = 'PENDING'
export const TAKEN = 'TAKEN'
export const EVALUATED = 'EVALUATED'

const STATUS = {
  PENDING,
  TAKEN,
  EVALUATED,
  asArray(): string[] {
    return [this.PENDING, this.TAKEN, this.EVALUATED]
  }
} as const

export default STATUS
