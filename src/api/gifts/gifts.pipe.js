import { checkSchema } from 'express-validator'

class Gifts {
  get create() {
    return checkSchema({
      paymentMethod: {
        in: 'body',
        isString: true
      },
      planId: {
        in: 'query',
        isString: true,
        toInt: true
      },
      email: {
        in: 'body',
        isEmail: true
      },
      requiresAction: {
        in: 'body',
        isBoolean: true
      } 
    })
  }

  get exchange() {
    return checkSchema({
      code: {
        errorMessage: 'code is required',
        in: 'query',
        isString: true
      }
    })
  }
}

export const pipe = new Gifts()
