import { checkSchema } from 'express-validator'
import type { ValidationChain } from 'express-validator'

class Meetings {
  get token(): ValidationChain[] {
    return checkSchema({
      room: {
        in: 'query',
        isString: true
      }
    })
  }

  get identity(): ValidationChain[] {
    return checkSchema({
      email: {
        in: 'query',
        isEmail: true
      },
      room: {
        in: 'query',
        isString: true
      }
    })
  }
}

export const pipe = new Meetings()
