import { checkSchema } from 'express-validator'

class Classes {
  get create() {
    return checkSchema({
      scheduleId: {
        in: 'body',
        isNumeric: true
      },
      packageId: {
        in: 'body',
        isNumeric: true
      },
      indications: {
        in: 'body',
        isJSON: true,
      }
    })
  }
 
  get getOne () {
    return checkSchema({
      name: {
        in: 'query',
        isString: true
      },
      info: {
        in: 'query',
        isBoolean: true,
        optional: true
      }
    })
  }
}

export const pipe = new Classes()
