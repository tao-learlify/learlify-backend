import { checkSchema } from 'express-validator'


export class Advance  {
  get create () {
    return checkSchema({
      courseId: {
        in: 'body',
        isNumeric: true,
        toInt: true,
      }
    })
  }
  
  
  get update () {
    return checkSchema ({
      completed: {
        in: 'body',
        isBoolean: true,
        optional: true
      },
      courseId: {
        in: 'body',
        isNumeric: true
      },
      last: {
        in: 'body',
        isNumeric: true
      },
      unit: {
        in: 'body',
        isNumeric: true
      }
    })
  }
}

export const pipe = new Advance()