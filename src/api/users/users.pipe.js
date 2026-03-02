import { checkSchema } from 'express-validator'
import { ConfigService } from 'api/config/config.service'

class Users {
  constructor() {
    this.configService = new ConfigService()
  }

  get getAll() {
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

  get getOne() {
    return checkSchema({
      id: {
        in: 'params',
        isNumeric: true,
        toInt: true
      }
    })
  }

  get updateOne() {
    const { nameOptions, passwordOptions } = this.configService

    return checkSchema({
      email: {
        isEmail: true
      },
      firstName: {
        isString: true,
        isLength: nameOptions
      },
      lastName: {
        isString: true,
        isLength: nameOptions
      },
      password: {
        isString: true,
        isLength: passwordOptions,
        optional: true
      },
      modelId: {
        isInt: true,
        toInt: true,
        optional: true
      }
    })
  }

  get updateTour() {
    return checkSchema({
      draft: {
        in: 'body',
        isString: true
      }
    })
  }
}

export const pipe = new Users()
