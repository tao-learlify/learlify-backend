import { checkSchema } from 'express-validator'
import { ConfigService } from 'api/config/config.service'

export class Admin {
  constructor() {
    this.configServce = new ConfigService()
  }

  get createUser() {
    const { nameOptions } = this.configServce

    return checkSchema({
      email: {
        in: 'body',
        isEmail: true
      },
      firstName: {
        in: 'body',
        isString: true,
        isLength: nameOptions
      },
      lastName: {
        in: 'body',
        isString: true,
        isLength: nameOptions
      },
      role: {
        in: 'body',
        isString: true
      },
      modelId: {
        isInt: true,
        toInt: true,
        optional: true
      }
    })
  }

  get viewInfo () {
    return checkSchema({
      email: {
        in: 'query',
        isEmail: true
      }
    })
  }
}

export const pipe = new Admin()
