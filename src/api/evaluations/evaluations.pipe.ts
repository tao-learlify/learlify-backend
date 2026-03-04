import { checkSchema, type ValidationChain } from 'express-validator'

class Evaluations {
  get getOne(): ValidationChain[] {
    return checkSchema({
      id: {
        errorMessage: 'The ID is required',
        in: 'params',
        isNumeric: true,
        toInt: true
      }
    })
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
        isNumeric: true,
        toInt: true
      },
      count: {
        in: 'query',
        isBoolean: true,
        toBoolean: true,
        optional: true
      },
      model: {
        in: 'query',
        isAlpha: true,
        optional: true
      }
    })
  }

  get create(): ValidationChain[] {
    return checkSchema({
      userId: {
        errorMessage: 'The userId is required',
        in: 'query',
        isNumeric: true,
        toInt: true
      },
      progressId: {
        errorMessage: 'The progressId is required',
        in: 'query',
        isNumeric: true,
        toInt: true
      }
    })
  }

  get update(): ValidationChain[] {
    return checkSchema({
      score: {
        in: 'body',
        isArray: true,
        optional: true
      },
      status: {
        in: 'body',
        isString: true,
        optional: true
      },
      comments: {
        in: 'body',
        isArray: true,
        optional: true
      },
      id: {
        in: 'params',
        isNumeric: true,
        toInt: true
      }
    })
  }
}

export const pipe = new Evaluations()
