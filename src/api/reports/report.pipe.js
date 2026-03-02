import { checkSchema } from 'express-validator'

class Report {
  constructor() {
    this.lengthOptions = {
      options: {
        max: 255,
        min: 15
      }
    }
  }

  get create() {
    return checkSchema({
      from: {
        in: 'body',
        isEmail: true
      },
      message: {
        in: 'body',
        isLength: this.lengthOptions
      },
      context: {
        in: 'body',
        isLength: this.lengthOptions
      },
      device: {
        in: 'body',
        isLength: {
          options: {
            max: 400
          }
        }
      }
    })
  }

  get quality () {
    return checkSchema({
      video: {
        in: 'body',
        isNumeric: true,
      },
      assist: {
        in: 'body',
        isNumeric: true
      },
      teacher: {
        in: 'query',
        isNumeric: true,
        toInt: true
      }
    })
  }
}

export const pipe = new Report()
