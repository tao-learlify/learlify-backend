import { checkSchema, type ValidationChain } from 'express-validator'
import { ConfigService } from 'api/config/config.service'

export class Admin {
  private configServce: ConfigService

  constructor() {
    this.configServce = new ConfigService()
  }

  get createUser(): ValidationChain[] {
    const { nameOptions } = this.configServce

    return checkSchema({
      email: {
        in: 'body',
        isEmail: true
      },
      firstName: {
        in: 'body',
        isString: true,
        isLength: { options: nameOptions }
      },
      lastName: {
        in: 'body',
        isString: true,
        isLength: { options: nameOptions }
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

  get viewInfo(): ValidationChain[] {
    return checkSchema({
      email: {
        in: 'query',
        isEmail: true
      }
    })
  }
}

export const pipe = new Admin()
