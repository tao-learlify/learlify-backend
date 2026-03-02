import { checkSchema } from 'express-validator'

class Packages {
  get assign () {
    return checkSchema({
      userId: {
        in: 'query',
        toInt: true,
        isNumeric: true
      },
      planId: {
        in: 'query',
        toInt: true,
        isNumeric: true
      }
    })
  }

  get create () {
    return checkSchema({
      planId: {
        in: 'query',
        toInt: true,
        isNumeric: true
      },
      paymentMethodId: {
        in: 'body',
        isString: true
      },
      requiresAction: {
        in: 'body',
        isBoolean: true,
        optional: true
      },
      cancel: {
        in: 'body',
        isBoolean: true,
        optional: true
      }
    })
  }

  get update () {
    return checkSchema({
      category: {
        isString: true,
        in: 'query',
        isNumeric: true
      },
      type: {
        isString: true,
        in: 'query',
        isNumeric: true,
      },
      progress: {
        in: 'body'
      },
      needsRevision: {
        in: 'body',
        isBoolean: true
      },
      activePackage: {
        in: 'body',
        optional: false
      }
    })
  }

  get getAll () {
    return checkSchema({
      active: {
        in: 'query',
        isBoolean: true,
        toBoolean: true
      }
    })
  }
}


export const pipe = new Packages()