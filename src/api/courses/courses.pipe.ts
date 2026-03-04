import { checkSchema, type ValidationChain } from 'express-validator'

class Courses {
  get inscription(): ValidationChain[] {
    return checkSchema({
      courseId: {
        errorMessage: 'courseId is required',
        in: 'body',
        isNumeric: true,
        toInt: true
      },
      inscription: {
        errorMessage: 'Inscription is required',
        in: 'query',
        isBoolean: true,
        toBoolean: true
      }
    })
  }

  get getAll(): ValidationChain[] {
    return checkSchema({
      demo: {
        in: 'query',
        isBoolean: true
      },

      model: {
        in: 'query',
        isAlpha: true
      }
    })
  }
}

export const pipe = new Courses()
