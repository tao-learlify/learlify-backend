import { checkSchema } from 'express-validator'
import type { ValidationChain } from 'express-validator'

class Feedback {
  get getOne(): ValidationChain[] {
    return checkSchema({
      categoryId: {
        in: 'query',
        isNumeric: true,
        toInt: true
      },

      examId: {
        in: 'query',
        isNumeric: true,
        toInt: true
      },

      model: {
        in: 'query',
        isString: true
      },

      ignore: {
        in: 'query',
        isBoolean: true
      }
    }) as unknown as ValidationChain[]
  }
}

export const pipe = new Feedback()
