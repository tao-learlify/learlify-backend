import { checkSchema } from 'express-validator'

class Youtube {
  get getAll () {
    return checkSchema({
      items: {
        in: 'query',
        isNumeric: true,
        toInt: true,
        optional: true
      }
    })
  }
}

export const pipe = new Youtube()