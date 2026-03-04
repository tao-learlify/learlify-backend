import { checkSchema } from 'express-validator'
import type { ValidationChain } from 'express-validator'
import { ConfigService } from 'api/config/config.service'

class Users {
  private configService: ConfigService

  constructor() {
    this.configService = new ConfigService()
  }

  get getAll(): ValidationChain[] {
    return checkSchema({
      role: {
        in: 'query',
        isString: true
      },
      search: {
        in: 'query',
        isString: true
      },
      page: {
        in: 'query',
        isNumeric: true,
        toInt: true
      },
      limit: {
        in: 'query',
        isNumeric: true,
        toInt: true,
        optional: true
      }
    })
  }

  get getOne(): ValidationChain[] {
    return checkSchema({
      id: {
        in: 'params',
        isNumeric: true,
        toInt: true
      }
    })
  }

  get updateOne(): ValidationChain[] {
    const { nameOptions, passwordOptions } = this.configService

    return checkSchema({
      email: {
        isEmail: true
      },
      firstName: {
        isString: true,
        isLength: { options: nameOptions }
      },
      lastName: {
        isString: true,
        isLength: { options: nameOptions }
      },
      password: {
        isString: true,
        isLength: { options: passwordOptions },
        optional: true
      },
      modelId: {
        isInt: true,
        toInt: true,
        optional: true
      }
    })
  }

  get updateTour(): ValidationChain[] {
    return checkSchema({
      draft: {
        in: 'body',
        isString: true
      }
    })
  }
}

export const pipe = new Users()
