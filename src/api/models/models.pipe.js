import { checkSchema } from 'express-validator'

class Models {
  get getOne () {
    return checkSchema({
      name: {
        in: 'query',
        isString: true,
        optional: true
      }
    })
  }

  get patch () {
    return checkSchema({
      name: {
        in: 'query',
        isString: true
      }
    })
  }
}

export const pipe = new Models()