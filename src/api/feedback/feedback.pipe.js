import { checkSchema } from 'express-validator'
 
class Feedback {
  get getOne () {
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
    })
  }
}

export const pipe = new Feedback()