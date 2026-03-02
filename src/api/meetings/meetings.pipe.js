import { checkSchema } from 'express-validator'

class Meetings {
  get token () {
    return checkSchema({
      room: {
        in: 'query',
        isString: true
      }
    })
  }
  
  
  get identity () {
    return checkSchema({
      email: {
        in: 'query',
        isEmail: true
      },
      room: {
        in:'query',
        isString: true
      }
    })
  }
}

export const pipe = new Meetings()