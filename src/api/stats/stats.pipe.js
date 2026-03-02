import { checkSchema } from 'express-validator'

export class Stats {
  get create () {
    return checkSchema({
      marking: {
        in: 'body',
        isString: true,
        isEmpty: false
      },
      points: {
        in: 'body',
        isInt: {
          options: {
            gt: 0,
            lt: 100
          }
        },
        isEmpty: false
      },
      progress: {
        in: 'body',
        isArray: true,
        isEmpty: false
      },
      examId: {
        in: 'query',
        isNumeric: true,
        toInt: true
      },
      category: {
        in: 'query',
        isString: true
      }
    })
  }
  
  get getAll () {
    return checkSchema({
      model: {
        in: 'query'
      }
    })
  }
}


export const pipe = new Stats()