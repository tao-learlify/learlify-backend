import { checkSchema, type ValidationChain } from 'express-validator'

class Access {
  get create(): ValidationChain[] {
    return checkSchema({
      planId: {
        in: 'body',
        isInt: true,
        toInt: true
      },
      feature: {
        in: 'body',
        isString: true
      }
    })
  }

  get getAll(): ValidationChain[] {
    return checkSchema({})
  }

  get getOne(): ValidationChain[] {
    return checkSchema({})
  }

  get updateOne(): ValidationChain[] {
    return checkSchema({})
  }
}

export const pipe = new Access()
