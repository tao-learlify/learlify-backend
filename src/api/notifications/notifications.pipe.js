import { checkSchema } from 'express-validator'

class Access {
  get create() {
    return checkSchema({
      senderId: {
        in: 'body',
        isInt: true,
        toInt: true,
        optional: true
      },
      userId: {
        in: 'body',
        isInt: true,
        toInt: true
      },
      message: {
        in: 'body',
        optional: true
      },
      read: {
        in: 'body',
        isBoolean: true,
        toBoolean: true,
        optional: true
      },
      deleted: {
        in: 'body',
        isBoolean: true,
        toBoolean: true,
        optional: true
      },
      type: {
        in: 'body',
        isInt: true,
        toInt: true
      }
    })
  }

  get getAll() {
    return checkSchema({
      unreads: {
        in: 'query',
        isBoolean: true,
        toBoolean: true,
        optional: true
      },
      page: {
        in: 'query',
        isInt: true,
        toInt: true,
        optional: true
      }
    })
  }

  get getOne() {
    return checkSchema({})
  }

  get updateOne() {
    return checkSchema({
      read: {
        in: 'body',
        toBoolean: true,
        isBoolean: true
      },
      id: {
        in: 'params',
        isInt: true
      }
    })
  }
}

export const pipe = new Access()
