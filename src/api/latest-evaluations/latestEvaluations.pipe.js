import { checkSchema } from 'express-validator'

class LatestEvaluations {
  get getOne() {
    return checkSchema({
      id: {
        errorMessage: 'The ID is required',
        in: 'params',
        isInt: true,
        toInt: true
      }
    })
  }

  get getAll() {
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
    })
  }
}

export const pipe = new LatestEvaluations()
