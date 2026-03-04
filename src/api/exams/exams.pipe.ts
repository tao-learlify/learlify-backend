import { checkSchema, type ValidationChain } from 'express-validator'


export class Exams {
  get getOne(): ValidationChain[] {
    return checkSchema({
      id: {
        in: 'params',
        toInt: true,
        isNumeric: true
      }
    })
  }

  get getAll(): ValidationChain[] {
    return checkSchema({
      model: {
        in: 'query',
        isString: true
      }
    })
  }
}

export const pipe = new Exams()
