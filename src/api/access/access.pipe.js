import { checkSchema } from 'express-validator'

class Access {
  get create() {
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

  get getAll() {
    return checkSchema({})
  }

  get getOne() {
    return checkSchema({})
  }

  get updateOne() {
    return checkSchema({})
  }
}

export const pipe = new Access()
