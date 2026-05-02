import { checkSchema } from 'express-validator'

export class AdvancePipe {
  get getAll(): ReturnType<typeof checkSchema> {
    return checkSchema({
      courseId: {
        in: 'query',
        isNumeric: true,
        toInt: true,
        errorMessage: 'courseId is required and must be numeric'
      }
    })
  }

  get create(): ReturnType<typeof checkSchema> {
    return checkSchema({
      courseId: {
        in: 'body',
        isNumeric: true,
        toInt: true,
      }
    })
  }

  get update(): ReturnType<typeof checkSchema> {
    return checkSchema({
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

export const pipe = new AdvancePipe()
