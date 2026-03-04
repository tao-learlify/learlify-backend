import { checkSchema } from 'express-validator'
import type { ValidationChain } from 'express-validator'

class LatestEvaluations {
  get getOne(): ValidationChain[] {
    return checkSchema({
      id: {
        errorMessage: 'The ID is required',
        in: 'params',
        isInt: true,
        toInt: true
      }
    }) as unknown as ValidationChain[]
  }

  get getAll(): ValidationChain[] {
    return checkSchema({
      own: {
        in: 'query',
        isBoolean: true,
        toBoolean: true,
        optional: true
      },
      page: {
        in: 'query',
        isInt: true,
        toInt: true
      }
    }) as unknown as ValidationChain[]
  }
}

export const pipe = new LatestEvaluations()
