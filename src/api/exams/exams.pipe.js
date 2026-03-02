import { checkSchema } from 'express-validator'


export class Exams {
  get getOne () {
    return checkSchema({
      id: {
        in: 'params',
        toInt: true,
        isNumeric: true
      }
    })
  }

  get getAll () {
    return checkSchema({
      model: {
        in: 'query',
        isString: true
      }
    })
  }
}

export const pipe = new Exams()