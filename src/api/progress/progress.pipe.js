import { checkSchema } from 'express-validator'

export class Progress {
  get create() {
    return checkSchema({
      examId: {
        in: 'body',
        isNumeric: true,
        toInt: true
      },
      data: {
        in: 'body'
      }
    })
  }

  get getOne() {
    return checkSchema({
      examId: {
        in: 'query',
        isInt: true,
        toInt: true
      }
    })
  }

  get updateOne() {
    return checkSchema({
      feedback: {
        in: 'body',
        optional: true
      },
      key: {
        in: 'body',
        isString: true,
        optional: true
      },
      lastIndex: {
        in: 'body',
        isNumeric: true,
        optional: true
      },
      id: {
        isNumeric: true,
        in: 'body',
        toInt: true,
        optional: true
      },
      score: {
        in: 'body',
        isNumeric: true,
        optional: true
      },
      uuid: {
        in: 'body',
        isUUID: true,
        optional: true
      },
      recordings: {
        in: 'body',
        optional: true
      }
    })
  }

  get patchOne() {
    return checkSchema({
      category: {
        in: 'query',
        isString: true
      },

      id: {
        in: 'query',
        isNumeric: true,
        toInt: true
      }
    })
  }
}

export const pipe = new Progress()
